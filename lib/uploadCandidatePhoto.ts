import { Platform } from 'react-native';
import { supabase } from './supabase';

// Web-only for now — the native app is paused (see the roadmap doc), and the
// web build has no image-picker dependency to add. Opens the OS file picker,
// downsizes whatever the user chose to a small square JPEG (this is an avatar
// / profile-card photo, not a full-res upload), and POSTs it to
// /api/upload-candidate-photo, which stores it in Supabase Storage and stamps
// candidates.photo_url. Returns the new public URL on success; throws with a
// message safe to show the user otherwise.

const MAX_DIMENSION = 640;
const JPEG_QUALITY = 0.85;

export async function pickAndUploadCandidatePhoto(): Promise<string> {
  if (Platform.OS !== 'web') {
    throw new Error('Photo upload is only available on the web app right now.');
  }

  const file = await pickImageFile();
  if (!file) throw new Error('No photo selected.');

  const { base64, mimeType } = await downscaleToJpeg(file);

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You need to be signed in to upload a photo.');

  const res = await fetch('/api/upload-candidate-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Upload failed. Please try again.');
  return body.url as string;
}

function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // If the user dismisses the OS picker with no selection, no event fires —
    // that's fine, the caller just never gets a URL and the button stays usable.
    input.click();
  });
}

function downscaleToJpeg(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not process the image.'));
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
