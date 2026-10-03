import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Skills assessment is no longer self-serve/auto-graded (2026-10-03) —
// Hiyame's internal team runs it, not the app. This endpoint only records
// that a candidate has asked for one; an admin (api/admin-review.ts) marks
// the verification_records row 'passed' or 'failed' once the internal team
// has actually assessed them. Upserting straight to 'pending' (rather than
// a plain insert) means a repeat request from the same candidate is a
// no-op, not a duplicate-row error — the (candidate_id, component) unique
// constraint from the verification pipeline migration already backs this.
//
// Auth: caller sends their Supabase bearer token; must have a candidate
// profile. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

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

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired session.' });

  const { data: candidate, error: candErr } = await admin
    .from('candidates')
    .select('id')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();
  if (candErr) return res.status(500).json({ error: candErr.message });
  if (!candidate) return res.status(404).json({ error: 'No candidate profile for this account.' });

  const { error: vrErr } = await admin
    .from('verification_records')
    .upsert(
      { candidate_id: candidate.id, component: 'skills_assessment', status: 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'candidate_id,component' }
    );
  if (vrErr) return res.status(500).json({ error: vrErr.message });

  return res.status(200).json({ ok: true });
}
