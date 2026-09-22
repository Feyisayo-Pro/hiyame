import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Both steps of the video-intro upload in one function — Vercel's Hobby
// plan caps a deployment at 12 serverless functions, so this and
// api/skills-assessment.ts / api/employer-review.ts each fold what would
// otherwise be 2 separate endpoints behind an `action` field instead.
//
// action: 'get-upload-url' — a 60s webcam clip is too large to route
//   through a single Vercel function body the way upload-candidate-photo
//   does with a downscaled JPEG (Vercel's JSON body cap is ~4.5MB). Instead
//   this hands back a short-lived signed Storage upload URL; the client
//   uploads the recorded Blob straight to Storage with it (bytes never
//   touch this function), then calls back with action: 'complete'.
// action: 'complete' — called once the client has uploaded the recorded
//   clip via that signed URL. Stamps candidates.video_intro_url (mirrors
//   candidates.photo_url exactly) and marks 'video_intro' verification
//   'passed' — the actual write app/(candidate)/verification.tsx's
//   checklist has been missing since this feature has existed. "Passed"
//   here means "a real video was submitted", not an automated content
//   review — matches this step's own description (companies watch it
//   themselves, the system doesn't grade it).
//
// Auth: caller sends their Supabase bearer token for both actions; the
// token's auth user must own the candidate row. Env: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'candidate-videos';

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

  // Stable path per candidate (upsert on completion), same "own id, own
  // file" convention as candidate-photos/company-logos — one intro video
  // at a time, re-recording overwrites it. Re-derived here, never trusted
  // from the request body.
  const path = `${candidate.id}.webm`;

  if (action === 'get-upload-url') {
    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: true });
    if (signErr || !signed) return res.status(502).json({ error: signErr?.message ?? 'Could not prepare upload.' });
    return res.status(200).json({ signedUrl: signed.signedUrl, path: signed.path, token: signed.token });
  }

  // action === 'complete' — confirm the upload actually landed before
  // marking anything "passed", so a client can't fake a verified step by
  // just calling this without really uploading.
  const { data: exists, error: statErr } = await admin.storage.from(BUCKET).list('', { search: path });
  if (statErr) return res.status(502).json({ error: statErr.message });
  if (!exists?.some((f) => f.name === path)) {
    return res.status(400).json({ error: 'No uploaded video found for this account. Upload it first.' });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updateErr } = await admin.from('candidates').update({ video_intro_url: url }).eq('id', candidate.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  const { error: vrErr } = await admin
    .from('verification_records')
    .upsert(
      { candidate_id: candidate.id, component: 'video_intro', status: 'passed', updated_at: new Date().toISOString() },
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
