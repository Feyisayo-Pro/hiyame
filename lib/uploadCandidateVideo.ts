import { Platform } from 'react-native';
import { supabase } from './supabase';

// Web-only for now — same reasoning as lib/uploadCandidatePhoto.ts (native
// app paused, web is the current delivery surface). Recording itself
// (getUserMedia + MediaRecorder) lives in components/VideoIntroRecorderModal;
// this file is just the two-call network handoff once a clip exists.
//
// Two calls, not one — see api/get-video-upload-url.ts's own comment for why
// a webcam clip can't go through a single JSON-body endpoint the way the
// photo upload does: this asks for a short-lived signed Storage upload URL,
// uploads the recorded Blob straight to Storage with it (bytes never pass
// through a Vercel function), then tells the server to finish the write.
export async function uploadCandidateVideo(blob: Blob): Promise<string> {
  if (Platform.OS !== 'web') {
    throw new Error('Video introduction recording is only available on the web app right now.');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You need to be signed in to submit a video.');

  const urlRes = await fetch('/api/video-intro', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get-upload-url' }),
  });
  const urlBody = await urlRes.json().catch(() => ({}));
  if (!urlRes.ok) throw new Error(urlBody?.error || 'Could not prepare the upload.');

  const { path, token: uploadToken } = urlBody as { path: string; token: string };
  const { error: uploadErr } = await supabase.storage
    .from('candidate-videos')
    .uploadToSignedUrl(path, uploadToken, blob, { contentType: 'video/webm' });
  if (uploadErr) throw new Error(uploadErr.message || 'Upload failed. Please try again.');

  const completeRes = await fetch('/api/video-intro', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'complete' }),
  });
  const completeBody = await completeRes.json().catch(() => ({}));
  if (!completeRes.ok) throw new Error(completeBody?.error || 'Could not finish saving your video.');
  return completeBody.url as string;
}
