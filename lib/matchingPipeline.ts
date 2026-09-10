// The one matching pipeline: load a role, score every plausible candidate
// against it with lib/matchingEngine, and persist the results to match_scores.
// Two entry points share this — scripts/run-matching.ts (operator CLI) and
// api/run-matching.ts (the Vercel function the app calls after a role is
// posted). Keep it free of React/React Native imports so both runtimes can
// bundle it; it takes a supabase-js client so the caller owns auth and keys.

import {
  scoreCandidate,
  assembleShortlist,
  type ScoringCandidateInput,
  type ScoringRoleInput,
  type MatchResult,
} from './matchingEngine';
import type { VerificationState } from './useVerification';
import type { ExperienceLevel, Tier } from './mock-data';

// Minimal shape we need from a supabase-js client — avoids a hard type
// dependency on @supabase/supabase-js from this shared module.
interface SupabaseLike {
  from: (table: string) => any;
}

// PostgREST caps an unbounded select at 1000 rows. Page through explicitly so
// a growing candidate pool is always scored in full.
async function selectAll(
  supabase: SupabaseLike,
  table: string,
  columns: string,
): Promise<any[]> {
  const pageSize = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    all.push(...page);
    if (page.length < pageSize) break;
  }
  return all;
}

function buildVerificationState(records: { component: string; status: string }[]): VerificationState {
  const passed = new Set(records.filter((r) => r.status === 'passed').map((r) => r.component));
  return {
    identityVerified: passed.has('identity'),
    videoIntroUploaded: passed.has('video_intro'),
    assessmentCompleted: passed.has('skills_assessment'),
    employerReviewSecured: passed.has('employer_review'),
  };
}

export interface RunMatchingResult {
  roleId: string;
  roleTitle: string;
  tier: Tier;
  candidatesConsidered: number;
  scored: number;
  shortlisted: number;
  alternates: number;
  shallowPool: boolean;
}

export interface RunMatchingOptions {
  // false (the default here) = verification is a soft ranking signal, not a
  // hard gate — the correct mode for the window before Smile ID is live and no
  // candidate has verification records. Pass true to restore strict PRD gating.
  requireVerification?: boolean;
}

/**
 * Score `roleId` against the candidate pool and upsert match_scores. Also
 * stamps roles.matching_ran_at so the UI can tell "not run yet" from
 * "ran, nothing matched". Idempotent — safe to re-run for the same role.
 * Throws on any database error; returns a summary on success.
 */
export async function runMatchingForRole(
  supabase: SupabaseLike,
  roleId: string,
  opts: RunMatchingOptions = {},
): Promise<RunMatchingResult> {
  const requireVerification = opts.requireVerification ?? false;

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .maybeSingle();
  if (roleError) throw roleError;
  if (!role) throw new Error(`No role found with id ${roleId}`);

  const roleInput: ScoringRoleInput = {
    tier: role.tier as Tier,
    experienceLevel: role.experience_level as ExperienceLevel | null,
    rateMax: role.rate_max,
    startDate: role.start_date,
    locationType: role.location_type,
    locationCity: role.location_city,
    requiredSkills: role.required_skills ?? { must_have: [], nice_to_have: [] },
  };

  // Pull the whole candidate table — every migrated candidate has an empty
  // tier_preferences, so a `.contains('tier_preferences', [tier])` pre-filter
  // (what the strict pipeline used) would return nothing. The engine's own
  // tier-preference filter handles the empty-list case as "open to all".
  const candidates = await selectAll(
    supabase,
    'candidates',
    'id, tier_preferences, experience_level, rate_min, availability_date, location, remote_preference, reliability_score, skill_tags',
  );

  const allRecords = await selectAll(supabase, 'verification_records', 'candidate_id, component, status');

  const recordsByCandidate = new Map<string, { component: string; status: string }[]>();
  for (const r of allRecords ?? []) {
    const list = recordsByCandidate.get(r.candidate_id) ?? [];
    list.push({ component: r.component, status: r.status });
    recordsByCandidate.set(r.candidate_id, list);
  }

  const entries: { candidateId: string; result: MatchResult }[] = [];
  for (const candidate of candidates ?? []) {
    const records = recordsByCandidate.get(candidate.id) ?? [];
    const verification = buildVerificationState(records);
    const hasPassedEmployerReview = records.some(
      (r) => r.component === 'employer_review' && r.status === 'passed',
    );

    const candidateInput: ScoringCandidateInput = {
      id: candidate.id,
      tierPreferences: candidate.tier_preferences ?? [],
      experienceLevel: candidate.experience_level,
      rateMin: candidate.rate_min,
      availabilityDate: candidate.availability_date,
      location: candidate.location,
      remotePreference: candidate.remote_preference,
      reliabilityScore: candidate.reliability_score,
      skillTags: candidate.skill_tags ?? [],
      verification,
      hasPassedEmployerReview,
    };

    entries.push({ candidateId: candidate.id, result: scoreCandidate(candidateInput, roleInput, { requireVerification }) });
  }

  const { shortlist, alternates, shallowPool } = assembleShortlist(entries);
  const alternateIds = new Set(alternates.map((e) => e.candidateId));

  // Persist only the shortlist (top 5) plus alternates (next 10) — never more
  // than 15 rows per role. A loosely-specified role can clear the threshold for
  // hundreds of candidates; storing all of them would bloat match_scores and
  // the shortlist screen only shows these two tiers anyway.
  const scoredEntries = [...shortlist, ...alternates];
  if (scoredEntries.length > 0) {
    const rows = scoredEntries.map((e) => ({
      role_id: roleId,
      candidate_id: e.candidateId,
      score: e.result.score,
      excluded: false,
      exclusion_reason: null,
      is_alternate: alternateIds.has(e.candidateId),
      score_breakdown: {
        ...e.result.breakdown,
        verified: e.result.verified ?? null,
        rateFlag: e.result.rateFlag ?? false,
      },
    }));
    const { error: upsertError } = await supabase
      .from('match_scores')
      .upsert(rows, { onConflict: 'role_id,candidate_id' });
    if (upsertError) throw upsertError;
  }

  // On a re-run, drop stale rows for candidates no longer in the shortlist —
  // but never touch a row the company has already acted on (Accept/Skip/Save),
  // since that's a real decision, not a score artefact.
  const keepIds = scoredEntries.map((e) => e.candidateId);
  let staleQuery = supabase
    .from('match_scores')
    .delete()
    .eq('role_id', roleId)
    .is('company_action', null);
  if (keepIds.length > 0) {
    staleQuery = staleQuery.not('candidate_id', 'in', `(${keepIds.join(',')})`);
  }
  const { error: staleError } = await staleQuery;
  if (staleError) throw staleError;

  const { error: stampError } = await supabase
    .from('roles')
    .update({ matching_ran_at: new Date().toISOString() })
    .eq('id', roleId);
  if (stampError) throw stampError;

  return {
    roleId,
    roleTitle: role.title,
    tier: role.tier as Tier,
    candidatesConsidered: (candidates ?? []).length,
    scored: scoredEntries.length,
    shortlisted: shortlist.length,
    alternates: alternates.length,
    shallowPool,
  };
}
