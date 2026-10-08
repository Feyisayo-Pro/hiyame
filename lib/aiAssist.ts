import { supabase } from './supabase';

// Client wrappers for api/ai-assist.ts. Unlike lib/requestNotify.ts's
// fire-and-forget notifiers, these are synchronous user-facing calls whose
// result the UI must render — so they throw on any failure (including the
// 429 rate-limit response) instead of swallowing it, and the caller's own
// try/catch drives its loading/error state.

async function bearerToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You need to be signed in.');
  return token;
}

async function postAiAssist<T>(body: Record<string, unknown>): Promise<T> {
  const token = await bearerToken();
  const res = await fetch('/api/ai-assist', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || 'AI request failed.');
  return payload as T;
}

export interface DraftJdFields {
  companyId: string;
  title: string;
  tier: string;
  roleFunction?: string;
  mustHave: string[];
  niceToHave: string[];
  experienceLevel?: string | null;
  employmentType?: string | null;
  locationType?: string;
  locationCity?: string;
  locationCountry?: string;
  rateMin?: string;
  rateMax?: string;
  rateType?: string;
  contractLength?: string;
}

export interface JobDescriptionDraft {
  overview: string;
  responsibilities: string;
  requirements: string;
}

export async function draftJobDescription(fields: DraftJdFields): Promise<JobDescriptionDraft> {
  return postAiAssist<JobDescriptionDraft>({ type: 'draft_jd', ...fields });
}

export async function getRoleBoostSuggestions(roleId: string): Promise<string[]> {
  const result = await postAiAssist<{ suggestions: string[] }>({ type: 'boost_role', roleId });
  return result.suggestions;
}
