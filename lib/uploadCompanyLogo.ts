import { Platform } from 'react-native';
import { supabase } from './supabase';

// Mirrors lib/uploadCandidatePhoto.ts exactly — web-only file picker, downsize
// to a small square JPEG, POST to /api/upload-company-logo, which stores it
// in Supabase Storage and stamps companies.logo_url. Returns the new public
// URL on success.

const MAX_DIMENSION = 640;
const JPEG_QUALITY = 0.85;

export async function pickAndUploadCompanyLogo(): Promise<string> {
  if (Platform.OS !== 'web') {
    throw new Error('Logo upload is only available on the web app right now.');
  }

  const file = await pickImageFile();
  if (!file) throw new Error('No logo selected.');

  const { base64, mimeType } = await downscaleToJpeg(file);

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You need to be signed in to upload a logo.');

  const res = await fetch('/api/upload-company-logo', {
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
