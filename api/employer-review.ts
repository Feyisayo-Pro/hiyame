import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, employerReviewRequestEmail } from '../lib/email';

// Both ends of the employer-review emailed-link flow in one function — see
// api/video-intro.ts's top comment for why (Vercel Hobby's 12-function cap).
// The two actions have deliberately different auth models, branched on
// before either does any auth check:
//
// action: 'request' (bearer-token auth, candidate-only) — starts the flow.
//   Creates a request row with a random token (the reviewer's only
//   credential — see 'submit' below), then emails the named employer a
//   link to app/employer-review/[token]. Known, pre-existing limitation,
//   not new here: Resend delivery to arbitrary external addresses is
//   blocked until this project's sending domain is verified (documented
//   separately) — this call is real and correct and starts working the
//   moment that's resolved.
//
// action: 'submit' (NO bearer auth — the URL token itself is the
//   credential, matching "possession of the emailed link = authorization",
//   the trust model this whole feature is built on). The reviewer has no
//   Hiyame account. Looks up the request row by token, rejects anything
//   already used/expired/unknown, then calls submit_employer_review(...) —
//   an existing security-definer RPC (supabase/migrations/20260914151500)
//   built for exactly this flow but with no caller until now — and marks
//   'employer_review' verification 'passed'.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_FROM,
// APP_URL (only 'request' needs the last three).

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || 'https://hiyame-five.vercel.app';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured.' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const action: unknown = body?.action;
  if (action !== 'request' && action !== 'submit') {
    return res.status(400).json({ error: "action must be 'request' or 'submit'." });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  if (action === 'request') {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ error: 'Missing access token.' });

    const employerName: unknown = body?.employerName;
    const employerEmail: unknown = body?.employerEmail;
    if (typeof employerName !== 'string' || !employerName.trim()) {
      return res.status(400).json({ error: "The employer's name is required." });
    }
    if (typeof employerEmail !== 'string' || !EMAIL_RE.test(employerEmail.trim())) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired session.' });

    const { data: candidate, error: candErr } = await admin
      .from('candidates')
      .select('id, full_name')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle();
    if (candErr) return res.status(500).json({ error: candErr.message });
    if (!candidate) return res.status(404).json({ error: 'No candidate profile for this account.' });

    const reviewToken = crypto.randomUUID();
    const { error: insertErr } = await admin.from('employer_review_requests').insert({
      candidate_id: candidate.id,
      employer_name: employerName.trim(),
      employer_email: employerEmail.trim().toLowerCase(),
      token: reviewToken,
    });
    if (insertErr) return res.status(500).json({ error: insertErr.message });

    const { subject, html } = employerReviewRequestEmail({
      candidateName: candidate.full_name,
      reviewUrl: `${APP_URL}/employer-review/${reviewToken}`,
    });
    const emailResult = await sendEmail({ to: employerEmail.trim(), subject, html });

    return res.status(200).json({ ok: true, emailSent: emailResult.ok, emailSkipped: emailResult.skipped ?? false });
  }

  // action === 'submit' — no bearer token; reviewToken is the credential.
  const reviewToken: unknown = body?.token;
  const qualityRating: unknown = body?.qualityRating;
  const reliabilityRating: unknown = body?.reliabilityRating;
  const communicationRating: unknown = body?.communicationRating;
  const wouldRehire: unknown = body?.wouldRehire;
  const reviewText: unknown = body?.reviewText;

  if (typeof reviewToken !== 'string' || !reviewToken) {
    return res.status(400).json({ error: 'Missing review token.' });
  }
  for (const [label, v] of [['qualityRating', qualityRating], ['reliabilityRating', reliabilityRating], ['communicationRating', communicationRating]] as const) {
    if (typeof v !== 'number' || v < 1 || v > 5 || !Number.isInteger(v)) {
      return res.status(400).json({ error: `${label} must be a whole number from 1 to 5.` });
    }
  }
  if (typeof wouldRehire !== 'boolean') {
    return res.status(400).json({ error: 'wouldRehire must be true or false.' });
  }

  const { data: request, error: reqErr } = await admin
    .from('employer_review_requests')
    .select('id, candidate_id, employer_name, status, expires_at')
    .eq('token', reviewToken)
    .maybeSingle();
  if (reqErr) return res.status(500).json({ error: reqErr.message });
  if (!request) return res.status(404).json({ error: 'This review link is invalid.' });
  if (request.status !== 'pending') return res.status(409).json({ error: 'This review has already been submitted.' });
  if (new Date(request.expires_at).getTime() < Date.now()) {
    await admin.from('employer_review_requests').update({ status: 'expired' }).eq('id', request.id);
    return res.status(410).json({ error: 'This review link has expired.' });
  }

  const { data: reviewId, error: rpcErr } = await admin.rpc('submit_employer_review', {
    p_candidate_id: request.candidate_id,
    p_reviewer_identity: request.employer_name,
    p_quality_rating: qualityRating,
    p_reliability_rating: reliabilityRating,
    p_communication_rating: communicationRating,
    p_would_rehire: wouldRehire,
    p_review_text: typeof reviewText === 'string' ? reviewText.trim().slice(0, 2000) : null,
  });
  if (rpcErr) return res.status(500).json({ error: rpcErr.message });

  const { error: updateErr } = await admin
    .from('employer_review_requests')
    .update({ status: 'submitted', review_id: reviewId })
    .eq('id', request.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  const { error: vrErr } = await admin
    .from('verification_records')
    .upsert(
      { candidate_id: request.candidate_id, component: 'employer_review', status: 'passed', updated_at: new Date().toISOString() },
      { onConflict: 'candidate_id,component' }
    );
  if (vrErr) return res.status(500).json({ error: vrErr.message });

  return res.status(200).json({ ok: true });
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
