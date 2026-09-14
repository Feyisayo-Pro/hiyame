import { supabase } from './supabase';

export type DeleteAccountOutcome =
  | { ok: true }
  | { ok: false; reason: 'unauthenticated' | 'unavailable' | 'error'; message: string };

// Calls the /api/delete-account serverless function, which removes the
// caller's own profile row(s) and their auth.users record with the service
// role (the client can't delete auth.users itself). Same-origin on the
// deployed site; in local `expo start --web` there's no /api route, so a
// non-JSON / 404 response is reported as 'unavailable'.
export async function requestDeleteAccount(): Promise<DeleteAccountOutcome> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return { ok: false, reason: 'unauthenticated', message: 'You need to be signed in.' };
  }

  let resp: Response;
  try {
    resp = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, reason: 'unavailable', message: 'Account deletion is unreachable right now.' };
  }

  const contentType = resp.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { ok: false, reason: 'unavailable', message: 'Account deletion runs on the deployed site only.' };
  }

  const payload = await resp.json().catch(() => null);
  if (!resp.ok || !payload?.ok) {
    return { ok: false, reason: 'error', message: payload?.error ?? `Could not delete account (${resp.status}).` };
  }
  return { ok: true };
}
