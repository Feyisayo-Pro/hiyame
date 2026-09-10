import { supabase } from './supabase';

// Fire-and-forget call to /api/notify-introduction, which sends the
// introduction-lifecycle emails via Resend. Never throws and never blocks the
// UI — the email is a side effect, not part of the user action. Silently
// no-ops in local dev (no /api route) and if the user has no session.
export async function notifyIntroduction(
  introductionId: string,
  event: 'sent' | 'accepted',
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/notify-introduction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ introductionId, event }),
    });
  } catch {
    // swallow — a failed notification must not affect the flow
  }
}
