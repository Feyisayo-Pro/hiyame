import { supabase } from './supabase';

export interface MatchingSummary {
  roleId: string;
  roleTitle: string;
  candidatesConsidered: number;
  scored: number;
  shortlisted: number;
  alternates: number;
  shallowPool: boolean;
}

export type MatchingOutcome =
  | { ok: true; summary: MatchingSummary }
  | { ok: false; reason: 'unauthenticated' | 'unavailable' | 'error'; message: string };

// Calls the /api/run-matching serverless function to (re)build a role's
// shortlist. Same-origin on the deployed site; in local `expo start --web`
// there's no /api route, so a non-JSON / 404 response is reported as
// 'unavailable' rather than throwing — the shortlist screen degrades to its
// normal empty state in that case.
export async function requestMatching(roleId: string): Promise<MatchingOutcome> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return { ok: false, reason: 'unauthenticated', message: 'You need to be signed in.' };
  }

  let resp: Response;
  try {
    resp = await fetch('/api/run-matching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roleId }),
    });
  } catch {
    return { ok: false, reason: 'unavailable', message: 'Matching service is unreachable.' };
  }

  const contentType = resp.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    // Most likely the static host returned index.html for an unknown path —
    // i.e. the function isn't deployed here (local dev).
    return { ok: false, reason: 'unavailable', message: 'Matching runs on the deployed site only.' };
  }

  const payload = await resp.json().catch(() => null);
  if (!resp.ok || !payload) {
    return { ok: false, reason: 'error', message: payload?.error ?? `Matching failed (${resp.status}).` };
  }
  return { ok: true, summary: payload as MatchingSummary };
}
