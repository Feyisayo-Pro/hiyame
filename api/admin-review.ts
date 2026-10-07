import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from '../lib/adminEmails';

// The admin API — backs the whole (admin) route group (app/(admin)/*.tsx).
// One function, not several, because Vercel's Hobby plan caps serverless
// functions at 12 and this project was already at 11 before this file grew
// (see api/video-intro.ts's own comment for the same reasoning on bundling
// multiple actions into one function). No separate admin auth/persona in
// the database — any signed-in user whose email is in lib/adminEmails.ts
// can call this; lib/useAuth.ts resolves that same email list to
// role: 'admin' client-side, so the two must never drift.
//
// GET  ?view=overview                              — pending/approved/rejected counts
// GET  ?view=candidates&status=&search=&page=       — paginated candidate directory
// GET  ?view=candidates&component=skills_assessment|cv_review|video_intro&page= —
//      candidates with a PENDING verification request for that component,
//      independent of their account status (a candidate can be long since
//      approved and still have a pending CV/video review, so the
//      account-status filter above can't find these — the Overview
//      screen's request cards link here).
// GET  ?view=companies&status=&search=&page=        — paginated company directory
// POST { type: 'company'|'candidate'|'assessment'|'cv_review'|'video_review', id, decision } — approve/reject
//   'assessment', 'cv_review' and 'video_review' update a verification_records
//   component (skills_assessment / cv_review / video_intro) rather than the
//   account's own status.

const REVIEW_COMPONENT: Record<string, string> = {
  assessment: 'skills_assessment',
  cv_review: 'cv_review',
  video_review: 'video_intro',
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAGE_SIZE = 20;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured.' });
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Missing access token.' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user?.email) return res.status(401).json({ error: 'Invalid or expired session.' });
  if (!isAdminEmail(userData.user.email)) {
    return res.status(403).json({ error: 'Not an admin.' });
  }

  if (req.method === 'GET') {
    const view = String(req.query.view ?? 'overview');

    if (view === 'overview') {
      const [
        { count: candPending }, { count: candApproved }, { count: candRejected },
        { count: coPending }, { count: coApproved }, { count: coRejected },
        { count: assessmentPending }, { count: cvReviewPending }, { count: videoReviewPending },
      ] = await Promise.all([
        admin.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        admin.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        admin.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        admin.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        admin.from('verification_records').select('*', { count: 'exact', head: true }).eq('component', 'skills_assessment').eq('status', 'pending'),
        admin.from('verification_records').select('*', { count: 'exact', head: true }).eq('component', 'cv_review').eq('status', 'pending'),
        admin.from('verification_records').select('*', { count: 'exact', head: true }).eq('component', 'video_intro').eq('status', 'pending'),
      ]);
      return res.status(200).json({
        candidates: { pending: candPending ?? 0, approved: candApproved ?? 0, rejected: candRejected ?? 0 },
        companies: { pending: coPending ?? 0, approved: coApproved ?? 0, rejected: coRejected ?? 0 },
        assessmentRequests: assessmentPending ?? 0,
        cvReviewRequests: cvReviewPending ?? 0,
        videoReviewRequests: videoReviewPending ?? 0,
      });
    }

    const status = String(req.query.status ?? 'pending');
    const search = String(req.query.search ?? '').trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (view === 'candidates') {
      const component = String(req.query.component ?? '').trim();

      if (component === 'skills_assessment' || component === 'cv_review' || component === 'video_intro') {
        // Independent of account status — see this file's own top comment.
        const { data: vrRows, count, error: vrErr } = await admin
          .from('verification_records')
          .select('candidate_id', { count: 'exact' })
          .eq('component', component)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .range(from, to);
        if (vrErr) return res.status(500).json({ error: vrErr.message });

        const ids = (vrRows ?? []).map((r) => r.candidate_id);
        const [{ data: rows, error }, { data: allVrecs }] = ids.length
          ? await Promise.all([
              admin.from('candidates').select('*').in('id', ids),
              admin.from('verification_records').select('candidate_id, component, status').in('candidate_id', ids),
            ])
          : [{ data: [] as any[], error: null }, { data: [] as any[] }];
        if (error) return res.status(500).json({ error: error.message });

        const vrByCandidate = new Map<string, { component: string; status: string }[]>();
        for (const v of allVrecs ?? []) {
          const list = vrByCandidate.get(v.candidate_id) ?? [];
          list.push({ component: v.component, status: v.status });
          vrByCandidate.set(v.candidate_id, list);
        }
        const byId = new Map((rows ?? []).map((r) => [r.id, r]));
        const candidates = ids.map((id) => byId.get(id)).filter(Boolean)
          .map((r: any) => ({ ...r, verification: vrByCandidate.get(r.id) ?? [] }));
        return res.status(200).json({ candidates, total: count ?? 0, page, pageSize: PAGE_SIZE });
      }

      let query = admin.from('candidates').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (status !== 'all') query = query.eq('status', status);
      if (search) query = query.ilike('full_name', `%${search}%`);
      const { data: rows, count, error } = await query.range(from, to);
      if (error) return res.status(500).json({ error: error.message });

      const ids = (rows ?? []).map((r) => r.id);
      const { data: vrecs } = ids.length
        ? await admin.from('verification_records').select('candidate_id, component, status').in('candidate_id', ids)
        : { data: [] as any[] };
      const vrByCandidate = new Map<string, { component: string; status: string }[]>();
      for (const v of vrecs ?? []) {
        const list = vrByCandidate.get(v.candidate_id) ?? [];
        list.push({ component: v.component, status: v.status });
        vrByCandidate.set(v.candidate_id, list);
      }
      const candidates = (rows ?? []).map((r) => ({ ...r, verification: vrByCandidate.get(r.id) ?? [] }));
      return res.status(200).json({ candidates, total: count ?? 0, page, pageSize: PAGE_SIZE });
    }

    if (view === 'companies') {
      let query = admin.from('companies').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (status !== 'all') query = query.eq('status', status);
      if (search) query = query.or(`legal_name.ilike.%${search}%,trading_name.ilike.%${search}%`);
      const { data: rows, count, error } = await query.range(from, to);
      if (error) return res.status(500).json({ error: error.message });

      const ids = (rows ?? []).map((r) => r.id);
      const { data: teamRows } = ids.length
        ? await admin.from('company_users').select('company_id, full_name, email, role').in('company_id', ids)
        : { data: [] as any[] };
      const teamByCompany = new Map<string, { full_name: string | null; email: string; role: string }[]>();
      for (const t of teamRows ?? []) {
        const list = teamByCompany.get(t.company_id) ?? [];
        list.push({ full_name: t.full_name, email: t.email, role: t.role });
        teamByCompany.set(t.company_id, list);
      }
      const companies = (rows ?? []).map((r) => ({ ...r, team: teamByCompany.get(r.id) ?? [] }));
      return res.status(200).json({ companies, total: count ?? 0, page, pageSize: PAGE_SIZE });
    }

    return res.status(400).json({ error: 'view must be "overview", "candidates", or "companies".' });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
    const type: unknown = body?.type;
    const id: unknown = body?.id;
    const decision: unknown = body?.decision;
    if (type !== 'company' && type !== 'candidate' && type !== 'assessment' && type !== 'cv_review' && type !== 'video_review') {
      return res.status(400).json({ error: 'type must be "company", "candidate", "assessment", "cv_review", or "video_review".' });
    }
    if (typeof id !== 'string' || id.length < 10) return res.status(400).json({ error: 'id is required.' });
    if (decision !== 'approved' && decision !== 'rejected') return res.status(400).json({ error: 'decision must be "approved" or "rejected".' });

    const component = REVIEW_COMPONENT[type];
    if (component) {
      const { error } = await admin
        .from('verification_records')
        .update({ status: decision === 'approved' ? 'passed' : 'failed', updated_at: new Date().toISOString() })
        .eq('candidate_id', id)
        .eq('component', component);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

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
