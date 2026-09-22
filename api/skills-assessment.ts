import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { SKILLS_ASSESSMENT_BANK, PASSING_SCORE, TOTAL_QUESTIONS } from '../lib/skillsAssessmentBank';

// Both steps of the skills assessment in one function — see
// api/video-intro.ts's top comment for why (Vercel Hobby's 12-function cap).
//
// action: 'questions' — serves the bank with the answer key stripped. See
//   lib/skillsAssessmentBank.ts's own top comment for why that file must
//   only ever be imported from api/*.ts, never app/ or components/.
// action: 'submit' — re-scores the attempt server-side against that same
//   bank; the client only ever sees question text/options and submits
//   {questionId, selectedIndex} pairs, never anything that would let it
//   self-report a score. A retake overwrites the previous attempt's row
//   (verification_records' unique (candidate_id, component) constraint
//   makes this a real upsert, not an accumulating history) — no cooldown,
//   matching how lenient every other self-serve step in this app is.
//
// Auth: caller sends their Supabase bearer token for both actions; must
// have a candidate profile. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface Answer {
  questionId: string;
  selectedIndex: number;
}

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
  const action: unknown = body?.action;
  if (action !== 'questions' && action !== 'submit') {
    return res.status(400).json({ error: "action must be 'questions' or 'submit'." });
  }

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

  if (action === 'questions') {
    const questions = SKILLS_ASSESSMENT_BANK.map(({ id, text, options }) => ({ id, text, options }));
    return res.status(200).json({ questions });
  }

  // action === 'submit'
  const answers: unknown = body?.answers;
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers must be an array.' });
  }
  const answerByQuestion = new Map<string, number>();
  for (const a of answers as Answer[]) {
    if (a && typeof a.questionId === 'string' && typeof a.selectedIndex === 'number') {
      answerByQuestion.set(a.questionId, a.selectedIndex);
    }
  }

  let score = 0;
  for (const q of SKILLS_ASSESSMENT_BANK) {
    if (answerByQuestion.get(q.id) === q.correctIndex) score += 1;
  }
  const passed = score >= PASSING_SCORE;

  const { error: vrErr } = await admin
    .from('verification_records')
    .upsert(
      {
        candidate_id: candidate.id,
        component: 'skills_assessment',
        status: passed ? 'passed' : 'failed',
        provider_ref: `${score}/${TOTAL_QUESTIONS}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'candidate_id,component' }
    );
  if (vrErr) return res.status(500).json({ error: vrErr.message });

  return res.status(200).json({ score, total: TOTAL_QUESTIONS, passed });
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
