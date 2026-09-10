import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
  sendEmail,
  introductionSentEmail,
  introductionAcceptedCompanyEmail,
  introductionAcceptedCandidateEmail,
} from '../lib/email';

// Sends the introduction-lifecycle emails (architecture doc §7.4) via Resend.
// Called fire-and-forget by the app after it creates an introduction
// (event: 'sent') and after the candidate accepts (event: 'accepted').
// Idempotent: each event stamps introductions.notified_*_at and won't resend.
//
// Auth: caller sends their Supabase bearer token; must be a party to the
// introduction. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
// EMAIL_FROM.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured.' });
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Missing access token.' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const introductionId: unknown = body?.introductionId;
  const event: unknown = body?.event;
  if (typeof introductionId !== 'string' || introductionId.length < 10) {
    return res.status(400).json({ error: 'introductionId is required.' });
  }
  if (event !== 'sent' && event !== 'accepted') {
    return res.status(400).json({ error: "event must be 'sent' or 'accepted'." });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired session.' });
  const authUserId = userData.user.id;

  const { data: intro, error: introErr } = await admin
    .from('introductions')
    .select('id, role_id, candidate_id, status, response_window_hours, notified_sent_at, notified_accepted_at')
    .eq('id', introductionId)
    .maybeSingle();
  if (introErr) return res.status(500).json({ error: introErr.message });
  if (!intro) return res.status(404).json({ error: 'Introduction not found.' });

  const { data: role } = await admin
    .from('roles')
    .select('title, function, company_id')
    .eq('id', intro.role_id)
    .maybeSingle();
  if (!role) return res.status(404).json({ error: 'Role not found.' });

  const { data: candidate } = await admin
    .from('candidates')
    .select('full_name, email, phone, auth_user_id')
    .eq('id', intro.candidate_id)
    .maybeSingle();

  const { data: membership } = await admin
    .from('company_users')
    .select('id')
    .eq('company_id', role.company_id)
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  const isParty = membership || (candidate?.auth_user_id && candidate.auth_user_id === authUserId);
  if (!isParty) return res.status(403).json({ error: 'Not authorised for this introduction.' });

  // ── sent → notify the candidate (company identity masked) ──
  if (event === 'sent') {
    if (intro.notified_sent_at) return res.status(200).json({ skipped: 'already notified' });
    if (!candidate?.email) return res.status(200).json({ skipped: 'candidate has no email' });

    const { data: company } = await admin
      .from('companies')
      .select('industry, size_range')
      .eq('id', role.company_id)
      .maybeSingle();

    const mail = introductionSentEmail({
      roleTitle: role.title,
      roleFunction: role.function,
      companyIndustry: company?.industry ?? null,
      companySizeRange: company?.size_range ?? null,
      hoursToRespond: intro.response_window_hours,
    });
    const r = await sendEmail({ to: candidate.email, ...mail });
    if (!r.ok && !r.skipped) return res.status(502).json({ error: r.error });
    await admin.from('introductions').update({ notified_sent_at: new Date().toISOString() }).eq('id', intro.id);
    return res.status(200).json({ sent: r.ok, skipped: r.skipped ?? false });
  }

  // ── accepted → notify both sides with contact details ──
  if (intro.status !== 'accepted') return res.status(409).json({ error: 'Introduction is not accepted.' });
  if (intro.notified_accepted_at) return res.status(200).json({ skipped: 'already notified' });

  const { data: company } = await admin
    .from('companies')
    .select('legal_name, trading_name')
    .eq('id', role.company_id)
    .maybeSingle();
  const { data: hiring } = await admin
    .from('company_users')
    .select('full_name, email')
    .eq('company_id', role.company_id)
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .maybeSingle();

  const companyName = company?.trading_name || company?.legal_name || 'the company';
  const results: Record<string, unknown> = {};

  if (hiring?.email) {
    const mail = introductionAcceptedCompanyEmail({
      roleTitle: role.title,
      candidateName: candidate?.full_name ?? 'The candidate',
      candidateEmail: candidate?.email ?? null,
      candidatePhone: candidate?.phone ?? null,
    });
    results.company = await sendEmail({ to: hiring.email, ...mail });
  }
  if (candidate?.email) {
    const mail = introductionAcceptedCandidateEmail({
      roleTitle: role.title,
      companyName,
      hiringContactName: hiring?.full_name ?? (hiring?.email ? hiring.email.split('@')[0] : null),
      hiringContactEmail: hiring?.email ?? null,
    });
    results.candidate = await sendEmail({ to: candidate.email, ...mail });
  }

  await admin.from('introductions').update({ notified_accepted_at: new Date().toISOString() }).eq('id', intro.id);
  return res.status(200).json({ ok: true, results });
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
