import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Both candidate self-upload flows that need a signed Storage URL (too
// large for Vercel's ~4.5MB JSON body cap the way upload-candidate-photo's
// base64 approach handles a downscaled JPEG) — video intro and CV — share
// this one function via a `kind` field. Folded together specifically
// because Vercel's Hobby plan caps a deployment at 12 serverless functions:
// this project hit that exact cap with upload-candidate-cv.ts as its own
// file (confirmed live, 2026-10-04 — the deploy failed even at exactly 12,
// so the real margin is tighter than the raw count suggests; don't add a
// 12th file again without folding something first).
//
// kind: 'video' (default, omit the field entirely for the recorder's own
//   calls — keeps lib/uploadCandidateVideo.ts's existing payload shape
//   working unchanged) | 'cv'
// action: 'get-upload-url' — hands back a short-lived signed Storage
//   upload URL; the client uploads the Blob/File straight to Storage with
//   it, bytes never touch this function, then calls back with 'complete'.
// action: 'complete' — confirms the upload actually landed (never trusts
//   the client's say-so), stamps the right candidates column, and upserts
//   verification_records as 'pending' either way (2026-10-07 — video used
//   to auto-pass the moment a file existed; now Hiyame's internal team
//   reviews both video and CV from /(admin)/candidates before either counts
//   toward verification, same shape).
//
// Auth: caller sends their Supabase bearer token for both actions; the
// token's auth user must own the candidate row. Env: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const KIND_CONFIG = {
  video: {
    bucket: 'candidate-videos',
    // 'video/quicktime' (.mov) covers an uploaded file — that's iPhone's
    // default export format; the in-app recorder only ever produces webm.
    extensionByMime: { 'video/webm': 'webm', 'video/mp4': 'mp4', 'video/quicktime': 'mov' } as Record<string, string>,
    defaultMime: 'video/webm',
    column: 'video_intro_url',
    component: 'video_intro',
    // Was 'passed' (auto-passed the moment a file existed) — now reviewed
    // by Hiyame's internal team same as CV (2026-10-07), so this step
    // actually gets watched by a person before counting toward verification.
    finalStatus: 'pending' as const,
    notFoundMessage: 'No uploaded video found for this account. Upload it first.',
  },
  cv: {
    bucket: 'candidate-cvs',
    extensionByMime: { 'application/pdf': 'pdf' } as Record<string, string>,
    defaultMime: 'application/pdf',
    column: 'cv_url',
    component: 'cv_review',
    finalStatus: 'pending' as const,
    notFoundMessage: 'No uploaded CV found for this account. Upload it first.',
  },
};

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
  const kindKey = body?.kind === 'cv' ? 'cv' : 'video';
  const kind = KIND_CONFIG[kindKey];

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
  // file" convention as candidate-photos/company-logos — one file at a
  // time, re-uploading replaces it. The extension isn't fixed for video
  // (webm/mp4/mov depending on source), so it's re-derived here from the
  // caller-supplied mimeType — never trusted for anything beyond picking
  // an extension, 'complete' independently confirms a real file landed.

  if (action === 'get-upload-url') {
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : kind.defaultMime;
    const ext = kind.extensionByMime[mimeType];
    if (!ext) return res.status(400).json({ error: kindKey === 'video' ? 'Unsupported video format. Use WebM, MP4, or MOV.' : 'Unsupported file format. Use PDF.' });
    const path = `${candidate.id}.${ext}`;

    // Clean up a previous submission in a different format — otherwise
    // switching from (say) a recorded .webm to an uploaded .mp4 next time
    // would leave the old .webm behind as an orphaned file forever, since
    // each extension is its own distinct storage path. (CV only ever has
    // one possible extension, so this is a no-op there.)
    const { data: existing } = await admin.storage.from(kind.bucket).list('', { search: candidate.id });
    const stale = (existing ?? []).filter((f) => f.name.startsWith(`${candidate.id}.`) && f.name !== path);
    if (stale.length > 0) {
      await admin.storage.from(kind.bucket).remove(stale.map((f) => f.name));
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(kind.bucket)
      .createSignedUploadUrl(path, { upsert: true });
    if (signErr || !signed) return res.status(502).json({ error: signErr?.message ?? 'Could not prepare upload.' });
    return res.status(200).json({ signedUrl: signed.signedUrl, path: signed.path, token: signed.token });
  }

  // action === 'complete' — confirm the upload actually landed before
  // writing anything, so a client can't fake a submission by just calling
  // this without really uploading. Matched by prefix, not an exact
  // filename, since the extension depends on which format was uploaded.
  const { data: found, error: statErr } = await admin.storage.from(kind.bucket).list('', { search: candidate.id });
  if (statErr) return res.status(502).json({ error: statErr.message });
  const uploaded = (found ?? []).find((f) => f.name.startsWith(`${candidate.id}.`));
  if (!uploaded) {
    return res.status(400).json({ error: kind.notFoundMessage });
  }

  const { data: pub } = admin.storage.from(kind.bucket).getPublicUrl(uploaded.name);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updateErr } = await admin.from('candidates').update({ [kind.column]: url }).eq('id', candidate.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  const { error: vrErr } = await admin
    .from('verification_records')
    .upsert(
      { candidate_id: candidate.id, component: kind.component, status: kind.finalStatus, updated_at: new Date().toISOString() },
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
