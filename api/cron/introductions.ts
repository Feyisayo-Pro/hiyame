import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, introductionReminderEmail, introductionExpiredEmail } from '../../lib/email';

// Scheduled tick (architecture doc §7.4). Triggered every 15 min by Supabase
// pg_cron via pg_net — not Vercel Cron — so cadence doesn't depend on the
// Vercel plan. Guarded by a shared secret (CRON_SECRET env var ==
// private.cron_settings.cron_secret in the database).
//
// Does the email side only:
//   * halfway-point reminder to candidates who haven't responded
//   * expiry notice to companies for introductions that have expired
// The status flip sent -> expired is pure SQL in expire_stale_introductions(),
// run by a separate every-10-min pg_cron job.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const HOUR_MS = 60 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !CRON_SECRET) {
    return res.status(500).json({ error: 'Server not configured.' });
  }
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (token !== CRON_SECRET) return res.status(401).json({ error: 'Unauthorised.' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const now = Date.now();
  const summary = { reminders: 0, expiryNotices: 0, errors: [] as string[] };

  // ── Reminders: sent, no reminder yet, past halfway, before deadline ──
  const { data: pending, error: pendErr } = await admin
    .from('introductions')
    .select('id, sent_at, response_window_hours, role_id, candidate_id')
    .eq('status', 'sent')
    .is('reminder_sent_at', null);
  if (pendErr) summary.errors.push(`load pending: ${pendErr.message}`);

  for (const intro of pending ?? []) {
    const sentAt = new Date(intro.sent_at).getTime();
    const deadline = sentAt + intro.response_window_hours * HOUR_MS;
    const halfway = sentAt + (intro.response_window_hours / 2) * HOUR_MS;
    if (now < halfway || now >= deadline) continue;

    const { data: role } = await admin.from('roles').select('title, company_id').eq('id', intro.role_id).maybeSingle();
    const { data: candidate } = await admin.from('candidates').select('email').eq('id', intro.candidate_id).maybeSingle();
    if (!role || !candidate?.email) {
      await admin.from('introductions').update({ reminder_sent_at: new Date().toISOString() }).eq('id', intro.id);
      continue;
    }
    const { data: company } = await admin.from('companies').select('industry, size_range').eq('id', role.company_id).maybeSingle();

    const mail = introductionReminderEmail({
      roleTitle: role.title,
      companyIndustry: company?.industry ?? null,
      companySizeRange: company?.size_range ?? null,
      hoursLeft: Math.max(1, Math.round((deadline - now) / HOUR_MS)),
    });
    const r = await sendEmail({ to: candidate.email, ...mail });
    if (r.ok) summary.reminders += 1;
    else if (!r.skipped) summary.errors.push(`reminder ${intro.id}: ${r.error}`);
    await admin.from('introductions').update({ reminder_sent_at: new Date().toISOString() }).eq('id', intro.id);
  }

  // ── Expiry notices: expired, not yet notified ──
  const { data: expired, error: expErr } = await admin
    .from('introductions')
    .select('id, role_id, candidate_id')
    .eq('status', 'expired')
    .is('notified_expired_at', null);
  if (expErr) summary.errors.push(`load expired: ${expErr.message}`);

  for (const intro of expired ?? []) {
    const { data: role } = await admin.from('roles').select('title, company_id').eq('id', intro.role_id).maybeSingle();
    const { data: candidate } = await admin.from('candidates').select('full_name').eq('id', intro.candidate_id).maybeSingle();
    if (!role) {
      await admin.from('introductions').update({ notified_expired_at: new Date().toISOString() }).eq('id', intro.id);
      continue;
    }
    const { data: hiring } = await admin
      .from('company_users')
      .select('email')
      .eq('company_id', role.company_id)
      .eq('status', 'active')
      .order('created_at')
      .limit(1)
      .maybeSingle();

    if (hiring?.email) {
      const mail = introductionExpiredEmail({
        roleTitle: role.title,
        candidateName: candidate?.full_name ?? 'The candidate',
      });
      const r = await sendEmail({ to: hiring.email, ...mail });
      if (r.ok) summary.expiryNotices += 1;
      else if (!r.skipped) summary.errors.push(`expiry ${intro.id}: ${r.error}`);
    }
    await admin.from('introductions').update({ notified_expired_at: new Date().toISOString() }).eq('id', intro.id);
  }

  return res.status(200).json(summary);
}
