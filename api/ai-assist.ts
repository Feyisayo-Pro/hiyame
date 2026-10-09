import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { draftJobDescription, suggestRoleBoosts } from '../lib/ai';

// Two AI-assist features behind one file (type: 'draft_jd' | 'boost_role') —
// Vercel's Hobby plan caps a deployment at 12 serverless functions and this
// is the 12th (see lib/uploadCandidateCV.ts's comment for the same
// constraint hit before). Both actions share the same auth + rate-limit
// gate, just branch on what they fetch/ask the model for.
//
// Auth: caller sends their Supabase bearer token; must be an active member
// of the company the request is for. Rate limit: 5 AI requests per company
// per rolling 24h (ai_requests table), combined across both actions — a
// plain count(*) pre-check, not an atomic lock; a soft cost control, not a
// security boundary.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DAILY_LIMIT = 5;

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
  const type: unknown = body?.type;
  if (type !== 'draft_jd' && type !== 'boost_role') {
    return res.status(400).json({ error: "type must be 'draft_jd' or 'boost_role'." });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired session.' });
  const authUserId = userData.user.id;

  let companyId: string;
  if (type === 'draft_jd') {
    companyId = body?.companyId;
  } else {
    const roleId = body?.roleId;
    if (typeof roleId !== 'string') return res.status(400).json({ error: 'roleId is required.' });
    const { data: role } = await admin.from('roles').select('company_id').eq('id', roleId).maybeSingle();
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    companyId = role.company_id;
  }
  if (typeof companyId !== 'string') return res.status(400).json({ error: 'companyId is required.' });

  const { data: membership } = await admin
    .from('company_users')
    .select('id')
    .eq('company_id', companyId)
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (!membership) return res.status(403).json({ error: 'Not authorised for this company.' });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('ai_requests')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return res.status(429).json({ error: `You've used today's ${DAILY_LIMIT} AI requests. Try again tomorrow.` });
  }

  if (type === 'draft_jd') {
    const title = body?.title;
    const tier = body?.tier;
    const mustHave = Array.isArray(body?.mustHave) ? body.mustHave : [];
    if (typeof title !== 'string' || !title.trim() || typeof tier !== 'string' || mustHave.length === 0) {
      return res.status(400).json({ error: 'title, tier, and at least one must-have skill are required.' });
    }

    const result = await draftJobDescription({
      title,
      tier,
      roleFunction: body?.roleFunction,
      mustHave,
      niceToHave: Array.isArray(body?.niceToHave) ? body.niceToHave : [],
      experienceLevel: body?.experienceLevel ?? null,
      employmentType: body?.employmentType ?? null,
      locationType: body?.locationType,
      locationCity: body?.locationCity,
      locationCountry: body?.locationCountry,
      rateMin: body?.rateMin,
      rateMax: body?.rateMax,
      rateType: body?.rateType,
      contractLength: body?.contractLength,
    });

    if (!result.ok) {
      return res.status(502).json({ error: result.error ?? 'AI request failed.' });
    }

    await admin.from('ai_requests').insert({ company_id: companyId, type: 'draft_jd' });
    return res.status(200).json(result.data);
  }

  // ── boost_role ──
  const roleId = body.roleId as string;
  const { data: role, error: roleErr } = await admin
    .from('roles')
    .select('title, tier, required_skills, experience_level, location_type, rate_min, rate_max')
    .eq('id', roleId)
    .maybeSingle();
  if (roleErr || !role) return res.status(404).json({ error: 'Role not found.' });

  const { data: matches } = await admin
    .from('match_scores')
    .select('score, company_action')
    .eq('role_id', roleId);
  const rows = matches ?? [];
  const matchCount = rows.length;
  const avgScore = matchCount > 0 ? rows.reduce((sum, r) => sum + (r.score ?? 0), 0) / matchCount : null;
  const skippedCount = rows.filter((r) => r.company_action === 'skipped').length;
  const savedCount = rows.filter((r) => r.company_action === 'saved').length;

  const requiredSkills = (role.required_skills as { must_have?: string[]; nice_to_have?: string[] }) ?? {};
  const result = await suggestRoleBoosts({
    title: role.title,
    tier: role.tier,
    requiredSkills: { mustHave: requiredSkills.must_have ?? [], niceToHave: requiredSkills.nice_to_have ?? [] },
    experienceLevel: role.experience_level,
    locationType: role.location_type,
    rateMin: role.rate_min,
    rateMax: role.rate_max,
    matchCount,
    avgScore,
    skippedCount,
    savedCount,
  });

  if (!result.ok) {
    return res.status(502).json({ error: result.error ?? 'AI request failed.' });
  }

  await admin.from('ai_requests').insert({ company_id: companyId, type: 'boost_role' });
  return res.status(200).json(result.data);
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
