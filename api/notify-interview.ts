import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, interviewScheduledEmail, interviewScheduledAdminEmail } from '../lib/email';
import { sendPushToUser } from '../lib/webPushSend';
import { ADMIN_EMAILS } from '../lib/adminEmails';

// Sends the "interview scheduled" notification (email via Resend + in-app
// push) to the candidate, and a copy to every admin in lib/adminEmails.ts
// so an interview getting booked is visible without checking the dashboard.
// Called fire-and-forget by the app right after a company schedules an
// interview. Idempotent: stamps interviews.notified_scheduled_at and won't
// resend. Mirrors api/notify-introduction.ts's shape.
//
// Auth: caller sends their Supabase bearer token; must be a company_user of
// the interview's company. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY, EMAIL_FROM.

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
  const interviewId: unknown = body?.interviewId;
  if (typeof interviewId !== 'string' || interviewId.length < 10) {
    return res.status(400).json({ error: 'interviewId is required.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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
