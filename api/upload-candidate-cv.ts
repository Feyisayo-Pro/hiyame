import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Both steps of the CV upload in one function, same reasoning as
// api/video-intro.ts's own comment (Vercel Hobby's 12-function cap — this
// is the 12th, right at the limit; any future endpoint needs to fold into
// an existing file, not add a new one).
//
// action: 'get-upload-url' — signed Storage upload URL, bytes never touch
//   this function.
// action: 'complete' — confirms the file actually landed, stamps
//   candidates.cv_url, and upserts verification_records
//   (component: 'cv_review', status: 'pending') — CV review needs an admin
//   to actually open the document, unlike video_intro which passes itself
//   the moment a real file exists.
//
// Auth: caller sends their Supabase bearer token for both actions; the
// token's auth user must own the candidate row. Env: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'candidate-cvs';

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
  if (action !== 'get-upload-url' && action !== 'complete') {
    return res.status(400).json({ error: "action must be 'get-upload-url' or 'complete'." });
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

  // Stable path per candidate (upsert on completion) — same "own id, own
  // file" convention as candidate-photos/candidate-videos. Re-uploading a
  // new CV overwrites the old one.
  const path = `${candidate.id}.pdf`;

  if (action === 'get-upload-url') {
    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: true });
    if (signErr || !signed) return res.status(502).json({ error: signErr?.message ?? 'Could not prepare upload.' });
    return res.status(200).json({ signedUrl: signed.signedUrl, path: signed.path, token: signed.token });
  }

  // action === 'complete' — confirm the upload actually landed before
  // marking the step pending review, so a client can't fake a submission by
  // just calling this without really uploading.
  const { data: exists, error: statErr } = await admin.storage.from(BUCKET).list('', { search: path });
  if (statErr) return res.status(502).json({ error: statErr.message });
  if (!exists?.some((f) => f.name === path)) {
    return res.status(400).json({ error: 'No uploaded CV found for this account. Upload it first.' });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updateErr } = await admin.from('candidates').update({ cv_url: url }).eq('id', candidate.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  const { error: vrErr } = await admin
    .from('verification_records')
    .upsert(
      { candidate_id: candidate.id, component: 'cv_review', status: 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'candidate_id,component' }
    );
  if (vrErr) return res.status(500).json({ error: vrErr.message });

  return res.status(200).json({ url });
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
