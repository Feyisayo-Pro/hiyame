import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Uploads a candidate's profile photo to the public "candidate-photos"
// Storage bucket (see scripts/create-photo-bucket.ts) and stamps the public
// URL onto candidates.photo_url. The client compresses/resizes the image to
// a small JPEG before calling this (see lib/uploadCandidatePhoto.ts) — this
// endpoint also enforces a hard size cap since it runs as a single JSON body,
// not a stream.
//
// Auth: caller sends their Supabase bearer token; the token's auth user must
// own the candidate row being updated. Env: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'candidate-photos';
const MAX_BASE64_CHARS = 4_500_000; // ~3.3MB decoded — comfortably under the bucket's 3MB *and* Vercel's ~4.5MB body cap headroom
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
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
  const imageBase64: unknown = body?.imageBase64;
  const mimeType: unknown = body?.mimeType;

  if (typeof mimeType !== 'string' || !ALLOWED_MIME[mimeType]) {
    return res.status(400).json({ error: 'mimeType must be image/jpeg, image/png or image/webp.' });
  }
  if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    return res.status(400).json({ error: 'imageBase64 is required.' });
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    return res.status(413).json({ error: 'Image too large. Please use a smaller photo.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid or expired session.' });
  const authUserId = userData.user.id;

  const { data: candidate, error: candErr } = await admin
    .from('candidates')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (candErr) return res.status(500).json({ error: candErr.message });
  if (!candidate) return res.status(404).json({ error: 'No candidate profile for this account.' });

  let bytes: Buffer;
  try {
    bytes = Buffer.from(imageBase64, 'base64');
  } catch {
    return res.status(400).json({ error: 'imageBase64 is not valid base64.' });
  }
  if (bytes.length === 0) return res.status(400).json({ error: 'Decoded image is empty.' });

  const ext = ALLOWED_MIME[mimeType];
  const path = `${candidate.id}.${ext}`;

  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: mimeType,
    upsert: true,
    cacheControl: '3600',
  });
  if (uploadErr) return res.status(502).json({ error: uploadErr.message });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust so the new photo shows immediately even though the path is stable.
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updateErr } = await admin.from('candidates').update({ photo_url: url }).eq('id', candidate.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  return res.status(200).json({ url });
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
