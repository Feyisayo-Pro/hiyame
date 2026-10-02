import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Minimal admin review endpoint for the lightweight account-vetting gate
// (2026-10-02) — a placeholder ahead of the real company CRM integration
// that will eventually own this. No separate admin auth/persona: any
// signed-in user (candidate or company) whose email is in ADMIN_EMAILS can
// list and act on pending accounts. Add emails here, not in a database
// table — there's no admin UI to manage admins themselves at this stage.
const ADMIN_EMAILS = ['feyilive@gmail.com'];

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured.' });
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Missing access token.' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user?.email) return res.status(401).json({ error: 'Invalid or expired session.' });
  if (!ADMIN_EMAILS.includes(userData.user.email.toLowerCase()) && !ADMIN_EMAILS.includes(userData.user.email)) {
    return res.status(403).json({ error: 'Not an admin.' });
  }

  if (req.method === 'GET') {
    const [{ data: companies, error: compErr }, { data: candidates, error: candErr }] = await Promise.all([
      admin.from('companies').select('id, legal_name, trading_name, industry, size_range, created_at').eq('status', 'pending').order('created_at'),
      admin.from('candidates').select('id, full_name, email, skill_tags, experience_level, created_at').eq('status', 'pending').order('created_at'),
    ]);
    if (compErr || candErr) return res.status(500).json({ error: (compErr ?? candErr)!.message });
    return res.status(200).json({ companies: companies ?? [], candidates: candidates ?? [] });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
    const type: unknown = body?.type;
    const id: unknown = body?.id;
    const decision: unknown = body?.decision;
    if (type !== 'company' && type !== 'candidate') return res.status(400).json({ error: 'type must be "company" or "candidate".' });
    if (typeof id !== 'string' || id.length < 10) return res.status(400).json({ error: 'id is required.' });
    if (decision !== 'approved' && decision !== 'rejected') return res.status(400).json({ error: 'decision must be "approved" or "rejected".' });

    const table = type === 'company' ? 'companies' : 'candidates';
    const { error } = await admin.from(table).update({ status: decision }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
