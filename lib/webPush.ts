import { Platform } from 'react-native';
import { supabase } from './supabase';

// Web Push — see supabase/migrations/20260914153000_push_subscriptions.sql
// for why this exists instead of the architecture doc's Expo push service.
// Web-only; native builds would need the real Expo push flow instead, but
// this app doesn't ship a native build right now.

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!VAPID_PUBLIC_KEY
  );
}

export async function getPushPermissionState(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// Registers the service worker (idempotent — browsers no-op a re-register of
// the same script), asks for notification permission if needed, subscribes
// with the browser's push service, and saves the subscription server-side.
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
      });
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const json = subscription.toJSON();
    const res = await fetch('/api/save-push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        authKey: json.keys?.auth,
      }),
    });
    return res.ok;
  } catch (e) {
    // The browser's push service itself can refuse registration (offline,
    // a locked-down browser build, corporate policy, etc.) — this is a
    // legitimate runtime outcome, not a bug, so surface it as "didn't work"
    // rather than letting it become an unhandled rejection.
    console.warn('[webPush] subscribe failed:', e);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/save-push-subscription', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Best-effort — a failed unsubscribe just means a stale subscription
    // that no longer matters once the user has turned the toggle off.
  }
}
