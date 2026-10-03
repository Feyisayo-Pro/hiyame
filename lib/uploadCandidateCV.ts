import { Platform } from 'react-native';
import { supabase } from './supabase';

// Mirrors lib/uploadCandidateVideo.ts's signed-URL pattern exactly — a real
// CV PDF can be several MB, too large to route through a single Vercel
// function body the way the base64-JSON photo/logo upload does.

export async function uploadCandidateCV(file: Blob): Promise<string> {
  if (Platform.OS !== 'web') {
    throw new Error('CV upload is only available on the web app right now.');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You need to be signed in to upload your CV.');

  const urlRes = await fetch('/api/upload-candidate-cv', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get-upload-url' }),
  });
  const urlBody = await urlRes.json().catch(() => ({}));
  if (!urlRes.ok) throw new Error(urlBody?.error || 'Could not prepare the upload.');

  const { path, token: uploadToken } = urlBody as { path: string; token: string };
  const { error: uploadErr } = await supabase.storage
    .from('candidate-cvs')
    .uploadToSignedUrl(path, uploadToken, file, { contentType: 'application/pdf' });
  if (uploadErr) throw new Error(uploadErr.message || 'Upload failed. Please try again.');

  const completeRes = await fetch('/api/upload-candidate-cv', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'complete' }),
  });
  const completeBody = await completeRes.json().catch(() => ({}));
  if (!completeRes.ok) throw new Error(completeBody?.error || 'Could not finish saving your CV.');
  return completeBody.url as string;
}
