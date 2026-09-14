// Server-only — sends a Web Push notification to every subscription an
// auth_user_id has saved (lib/webPush.ts / push_subscriptions table). Mirrors
// lib/email.ts's shape (same SendResult-style return, same "skip cleanly if
// unconfigured" behavior) but is never imported from app/ or components/ —
// web-push uses Node's crypto and has no browser/React Native build.
import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

let configured = false;
function ensureConfigured(): boolean {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  if (!configured) {
    webpush.setVapidDetails('mailto:strivoglobal@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  }
  return true;
}

export async function sendPushToUser(
  admin: SupabaseClient,
  authUserId: string,
  payload: { title: string; body: string; url?: string },
): Promise<{ sent: number; skipped: boolean }> {
  if (!ensureConfigured()) return { sent: 0, skipped: true };

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('auth_user_id', authUserId);
  if (!subs || subs.length === 0) return { sent: 0, skipped: false };

  const json = JSON.stringify(payload);
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        json,
      );
      sent += 1;
    } catch (e: any) {
      // 404/410 means the browser subscription is gone (uninstalled, site
      // data cleared, etc.) — clean it up so we stop trying every time.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }
  return { sent, skipped: false };
}
