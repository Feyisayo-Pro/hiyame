#!/usr/bin/env -S npx tsx
/// <reference types="node" />
// Run the matching engine (lib/matchingEngine.ts) for one role and persist the
// results to match_scores. Manually invoked for now — no auto-trigger on role
// status change yet (that's Edge Function infra not built this pass; see the
// matching-engine milestone plan). Same service-role/.env.migration pattern as
// migrate-strivo-data.ts and invite-strivo-users.ts.
//
// Usage: npm run match:role -- --role-id <uuid>

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  scoreCandidate,
  assembleShortlist,
  type ScoringCandidateInput,
  type ScoringRoleInput,
} from '../lib/matchingEngine';
import type { VerificationState } from '../lib/useVerification';
import type { ExperienceLevel, Tier } from '../lib/mock-data';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(join(__dirname, '.env.migration'));

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const VERIFICATION_COMPONENTS = ['identity', 'video_intro', 'skills_assessment', 'employer_review'] as const;

function buildVerificationState(records: { component: string; status: string }[]): VerificationState {
  const passed = new Set(records.filter((r) => r.status === 'passed').map((r) => r.component));
  return {
    identityVerified: passed.has('identity'),
    videoIntroUploaded: passed.has('video_intro'),
    assessmentCompleted: passed.has('skills_assessment'),
    employerReviewSecured: passed.has('employer_review'),
  };
}

async function main() {
  const roleId = argValue('--role-id');
  if (!roleId) {
    console.error('Usage: npm run match:role -- --role-id <uuid>');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in scripts/.env.migration (gitignored).');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: role, error: roleError } = await supabase.from('roles').select('*').eq('id', roleId).maybeSingle();
  if (roleError) throw roleError;
  if (!role) {
    console.error(`No role found with id ${roleId}`);
    process.exit(1);
  }

  const roleInput: ScoringRoleInput = {
    tier: role.tier as Tier,
    experienceLevel: role.experience_level as ExperienceLevel | null,
    rateMax: role.rate_max,
    startDate: role.start_date,
    locationType: role.location_type,
    locationCity: role.location_city,
    requiredSkills: role.required_skills ?? { must_have: [], nice_to_have: [] },
  };

  // Cheap SQL pre-filter: only candidates who've marked this tier as open at
  // all. Avoids scoring the full candidate table on every run — with 1,117 rows
  // and (today) zero verified/tier-preferenced candidates, this typically
  // returns nothing, which is the correct, expected result right now, not a bug.
  const { data: candidates, error: candError } = await supabase
    .from('candidates')
    .select('*')
    .contains('tier_preferences', [role.tier]);
  if (candError) throw candError;

  console.log(`Role: ${role.title} (${role.tier}). Candidates with this tier open: ${candidates?.length ?? 0}`);

  const entries: { candidateId: string; result: ReturnType<typeof scoreCandidate> }[] = [];

  for (const candidate of candidates ?? []) {
    const { data: records, error: recError } = await supabase
      .from('verification_records')
      .select('component, status')
      .eq('candidate_id', candidate.id);
    if (recError) throw recError;

    const verification = buildVerificationState(records ?? []);
    const hasPassedEmployerReview = (records ?? []).some(
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

    const result = scoreCandidate(candidateInput, roleInput);
    entries.push({ candidateId: candidate.id, result });
  }

  const { shortlist, alternates, shallowPool } = assembleShortlist(entries);
  const shortlistIds = new Set(shortlist.map((e) => e.candidateId));
  const alternateIds = new Set(alternates.map((e) => e.candidateId));

  if (entries.length > 0) {
    const rows = entries.map((e) => ({
      role_id: roleId,
      candidate_id: e.candidateId,
      score: e.result.score,
      excluded: e.result.excluded,
      exclusion_reason: e.result.exclusionReason ?? null,
      is_alternate: alternateIds.has(e.candidateId),
      score_breakdown: e.result.breakdown,
    }));
    const { error: upsertError } = await supabase
      .from('match_scores')
      .upsert(rows, { onConflict: 'role_id,candidate_id' });
    if (upsertError) throw upsertError;
  }

  console.log(`Scored: ${entries.length}. Shortlist: ${shortlist.length}. Alternates: ${alternates.length}. Shallow pool: ${shallowPool}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
