import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  sendEmail,
  introductionSentEmail,
  applicationReceivedEmail,
  introductionAcceptedCompanyEmail,
  introductionAcceptedCandidateEmail,
  interviewScheduledEmail,
  interviewScheduledAdminEmail,
} from '../lib/email';
import { sendPushToUser } from '../lib/webPushSend';
import { ADMIN_EMAILS } from '../lib/adminEmails';

// Sends the introduction-lifecycle emails (architecture doc §7.4) via Resend.
// Called fire-and-forget by the app after it creates an introduction
// (event: 'sent') and after the candidate accepts (event: 'accepted').
// Idempotent: each event stamps introductions.notified_*_at and won't resend.
//
// Also handles interview-scheduled notifications (kind: 'interview') — folded
// in here rather than kept as its own api/notify-interview.ts file: Vercel's
// Hobby plan caps a deployment at 12 serverless functions, and this project
// hit that cap again even at exactly 12 files (same thing video-intro.ts's
// own comment already documented once before — the real margin is tighter
// than the raw count suggests). Was nearly identical in shape already
// ("Mirrors api/notify-introduction.ts's shape" was its own old comment).
//
// Auth: caller sends their Supabase bearer token; must be a party to the
// introduction (kind: 'introduction', default) or a company_user of the
// interview's company (kind: 'interview'). Env: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_FROM.

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

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  if (body?.kind === 'interview') {
    return handleInterviewNotify(admin, token, body, res);
  }

  const introductionId: unknown = body?.introductionId;
  const event: unknown = body?.event;
  if (typeof introductionId !== 'string' || introductionId.length < 10) {
    return res.status(400).json({ error: 'introductionId is required.' });
  }
  if (event !== 'sent' && event !== 'accepted') {
    return res.status(400).json({ error: "event must be 'sent' or 'accepted'." });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired session.' });
  const authUserId = userData.user.id;

  const { data: intro, error: introErr } = await admin
    .from('introductions')
    .select('id, role_id, candidate_id, status, response_window_hours, initiated_by, notified_sent_at, notified_accepted_at')
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

  // ── sent → who gets notified depends on who sent it. Company-initiated
  // (the original case): notify the candidate, identity masked. Candidate-
  // initiated (applied directly, 2026-10-08): the direction flips — notify
  // the company's hiring contact instead, nothing masked (the candidate
  // chose this company; the company should see who applied right away).
  if (event === 'sent') {
    if (intro.notified_sent_at) return res.status(200).json({ skipped: 'already notified' });

    if (intro.initiated_by === 'candidate') {
      const { data: hiring } = await admin
        .from('company_users')
        .select('full_name, email, auth_user_id')
        .eq('company_id', role.company_id)
        .eq('status', 'active')
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (!hiring?.email) return res.status(200).json({ skipped: 'company has no hiring contact email' });

      const mail = applicationReceivedEmail({
        roleTitle: role.title,
        candidateName: candidate?.full_name ?? 'A candidate',
      });
      const r = await sendEmail({ to: hiring.email, ...mail });
      if (!r.ok && !r.skipped) return res.status(502).json({ error: r.error });
      if (hiring.auth_user_id) {
        await sendPushToUser(admin, hiring.auth_user_id, {
          title: 'New applicant',
          body: `${candidate?.full_name ?? 'A candidate'} applied to ${role.title}.`,
          url: '/(company)/shortlist',
        });
      }
      await admin.from('introductions').update({ notified_sent_at: new Date().toISOString() }).eq('id', intro.id);
      return res.status(200).json({ sent: r.ok, skipped: r.skipped ?? false });
    }

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
    if (candidate.auth_user_id) {
      await sendPushToUser(admin, candidate.auth_user_id, {
        title: 'A company wants to connect',
        body: `${role.title} — respond within ${intro.response_window_hours}h.`,
        url: '/(candidate)/opportunities',
      });
    }
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
    .select('full_name, email, auth_user_id')
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
  if (hiring?.auth_user_id) {
    await sendPushToUser(admin, hiring.auth_user_id, {
      title: 'Introduction accepted',
      body: `${candidate?.full_name ?? 'A candidate'} accepted your introduction for ${role.title}.`,
      url: '/(company)/messages',
    });
  }
  if (candidate?.email) {
    const mail = introductionAcceptedCandidateEmail({
      roleTitle: role.title,
      companyName,
      // No more email-prefix fallback — lib/email.ts already omits the
      // "Contact:" line entirely when this is null, which reads better than
      // a name built out of someone's email address.
      hiringContactName: hiring?.full_name ?? null,
      hiringContactEmail: hiring?.email ?? null,
    });
    results.candidate = await sendEmail({ to: candidate.email, ...mail });
  }
  if (candidate?.auth_user_id) {
    await sendPushToUser(admin, candidate.auth_user_id, {
      title: `You're connected with ${companyName}`,
      body: `Your introduction for ${role.title} is confirmed.`,
      url: '/(candidate)/messages',
    });
  }

  await admin.from('introductions').update({ notified_accepted_at: new Date().toISOString() }).eq('id', intro.id);
  return res.status(200).json({ ok: true, results });
}

// Moved from the old api/notify-interview.ts verbatim (see the folding note
// at the top of this file) — just takes the already-created admin client
// and parsed body instead of parsing them again.
async function handleInterviewNotify(
  admin: SupabaseClient,
  token: string,
  body: any,
  res: VercelResponse
) {
  const interviewId: unknown = body?.interviewId;
  if (typeof interviewId !== 'string' || interviewId.length < 10) {
    return res.status(400).json({ error: 'interviewId is required.' });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired session.' });
  const authUserId = userData.user.id;

  const { data: interview, error: interviewErr } = await admin
    .from('interviews')
    .select('id, company_id, candidate_id, role_id, scheduled_at, duration_minutes, meeting_url, notified_scheduled_at')
    .eq('id', interviewId)
    .maybeSingle();
  if (interviewErr) return res.status(500).json({ error: interviewErr.message });
  if (!interview) return res.status(404).json({ error: 'Interview not found.' });
  if (interview.notified_scheduled_at) return res.status(200).json({ skipped: 'already notified' });

  const { data: membership } = await admin
    .from('company_users')
    .select('id')
    .eq('company_id', interview.company_id)
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (!membership) return res.status(403).json({ error: 'Not authorised for this interview.' });

  const [{ data: candidate }, { data: company }, { data: role }] = await Promise.all([
    admin.from('candidates').select('full_name, email, auth_user_id').eq('id', interview.candidate_id).maybeSingle(),
    admin.from('companies').select('legal_name, trading_name').eq('id', interview.company_id).maybeSingle(),
    interview.role_id
      ? admin.from('roles').select('title').eq('id', interview.role_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const companyName = company?.trading_name || company?.legal_name || 'the company';
  const results: Record<string, unknown> = {};

  if (candidate?.email) {
    const mail = interviewScheduledEmail({
      companyName,
      roleTitle: role?.title ?? null,
      scheduledAt: interview.scheduled_at,
      durationMinutes: interview.duration_minutes,
      meetingUrl: interview.meeting_url,
    });
    results.email = await sendEmail({ to: candidate.email, ...mail });
  }
  if (candidate?.auth_user_id) {
    results.push = await sendPushToUser(admin, candidate.auth_user_id, {
      title: 'Interview scheduled',
      body: `${companyName} booked an interview with you${role?.title ? ` for ${role.title}` : ''}.`,
      url: '/(candidate)/interviews',
    });
  }

  const adminMail = interviewScheduledAdminEmail({
    candidateName: candidate?.full_name ?? 'A candidate',
    companyName,
    roleTitle: role?.title ?? null,
    scheduledAt: interview.scheduled_at,
    durationMinutes: interview.duration_minutes,
  });
  results.adminEmails = await Promise.all(
    ADMIN_EMAILS.map((to) => sendEmail({ to, ...adminMail }))
  );

  await admin.from('interviews').update({ notified_scheduled_at: new Date().toISOString() }).eq('id', interview.id);
  return res.status(200).json({ ok: true, results });
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
