import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Stores/removes a browser's Web Push subscription (lib/webPush.ts). Same
// bearer-token auth pattern as the other api/ routes — the row is scoped to
// the caller's own auth_user_id via RLS, this endpoint doesn't need the
// service role for that part, but uses it anyway for the upsert-on-endpoint-
// conflict behavior (ON CONFLICT needs to target the unique `endpoint`
// column across all users, which a plain authenticated insert can't express
// safely under RLS).

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
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
  const authUserId = userData.user.id;

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const endpoint: unknown = body?.endpoint;
  if (typeof endpoint !== 'string' || !endpoint) {
    return res.status(400).json({ error: 'endpoint is required.' });
  }

  if (req.method === 'DELETE') {
    const { error } = await admin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('auth_user_id', authUserId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  const p256dh: unknown = body?.p256dh;
  const authKey: unknown = body?.authKey;
  if (typeof p256dh !== 'string' || typeof authKey !== 'string' || !p256dh || !authKey) {
    return res.status(400).json({ error: 'p256dh and authKey are required.' });
  }

  const { error } = await admin
    .from('push_subscriptions')
    .upsert({ auth_user_id: authUserId, endpoint, p256dh, auth_key: authKey }, { onConflict: 'endpoint' });
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
