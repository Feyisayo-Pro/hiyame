import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { runMatchingForRole } from '../lib/matchingPipeline';

// Serverless endpoint the app calls right after a role is posted (and from the
// shortlist screen's "re-run" action) to build that role's shortlist. Runs the
// shared matching pipeline with the service-role key — the app itself can't
// read the raw candidate pool, by design, so scoring has to happen here.
//
// Auth: the caller sends their Supabase access token as a Bearer header. We
// verify it, confirm they belong to the role's company, then run with elevated
// privilege. Env vars (Vercel project settings): SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Matching is not configured on the server.' });
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing access token.' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const roleId: unknown = body?.roleId;
  if (typeof roleId !== 'string' || roleId.length < 10) {
    return res.status(400).json({ error: 'roleId is required.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Who is calling?
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
  const authUserId = userData.user.id;

  // Does this role exist, and does the caller belong to its company?
  const { data: role, error: roleError } = await admin
    .from('roles')
    .select('id, company_id')
    .eq('id', roleId)
    .maybeSingle();
  if (roleError) return res.status(500).json({ error: roleError.message });
  if (!role) return res.status(404).json({ error: 'Role not found.' });

  const { data: membership, error: memberError } = await admin
    .from('company_users')
    .select('id')
    .eq('company_id', role.company_id)
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (memberError) return res.status(500).json({ error: memberError.message });
  if (!membership) return res.status(403).json({ error: 'Not authorised for this role.' });

  try {
    const summary = await runMatchingForRole(admin, roleId);
    return res.status(200).json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Matching failed.';
    return res.status(500).json({ error: message });
  }
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
