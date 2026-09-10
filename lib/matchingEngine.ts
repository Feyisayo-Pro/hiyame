import type { VerificationState } from './useVerification';
import type { Tier, ExperienceLevel } from './mock-data';

// ==========================================
// BUSINESS RULES — TIER ELIGIBILITY
// ==========================================
// Corporate: ALL 4 verification components required
// Short-Term: ANY 3 of 4 components required
// Gig: Waitlisted — always returns ineligible

export interface EligibilityResult {
  eligible: boolean;
  message: string;
}

const COMPONENT_LABELS: Record<keyof VerificationState, string> = {
  identityVerified: 'Identity Verification',
  videoIntroUploaded: 'Video Introduction',
  assessmentCompleted: 'Skills Assessment',
  employerReviewSecured: 'Employer Review',
};

/**
 * Evaluate whether a candidate qualifies for a given role tier
 * based on their current verification status.
 */
export function evaluateEligibility(
  verificationStatus: VerificationState,
  roleType: Tier,
): EligibilityResult {
  const completedCount = Object.values(verificationStatus).filter(Boolean).length;

  switch (roleType) {
    case 'corporate':
      if (completedCount === 4) {
        return { eligible: true, message: 'Fully verified — eligible for Corporate roles' };
      }
      return {
        eligible: false,
        message: `Corporate roles require all 4 verification components (${completedCount}/4 complete)`,
      };

    case 'short_term':
      if (completedCount >= 3) {
        return { eligible: true, message: 'Eligible for Short-Term roles' };
      }
      return {
        eligible: false,
        message: `Short-Term roles require at least 3 verification components (${completedCount}/4 complete)`,
      };

    case 'gig':
      return {
        eligible: false,
        message: 'Gig roles are currently waitlisted. Matching for this tier is not yet live.',
      };

    default:
      return { eligible: false, message: 'Unknown role tier' };
  }
}

/**
 * Return the labels of verification components the candidate
 * is still missing to unlock a given tier.
 */
export function getMissingRequirements(
  verificationStatus: VerificationState,
  roleType: Tier,
): string[] {
  // Gig is always waitlisted — no actionable missing items
  if (roleType === 'gig') {
    return ['Gig tier matching is not yet available'];
  }

  const missing: string[] = [];
  const entries = Object.entries(verificationStatus) as [keyof VerificationState, boolean][];

  for (const [key, completed] of entries) {
    if (!completed) {
      missing.push(COMPONENT_LABELS[key]);
    }
  }

  // For short_term, candidate only needs 3 of 4 — if they have 3+, nothing missing
  if (roleType === 'short_term') {
    const completedCount = entries.filter(([, v]) => v).length;
    if (completedCount >= 3) return [];
    // Show all missing but note only some are needed
    return missing;
  }

  // Corporate requires all 4
  return missing;
}

// ==========================================
// MATCHING ENGINE — SCORING (architecture doc §7.1, PRD §5.2)
// ==========================================
// NOTE ON WEIGHTS: the architecture doc describes these rules qualitatively but
// cites an actual PRD (Hiyame_PRD_v1_2026.pdf) for the exact point-weights — that
// file does not exist anywhere on this machine (searched hiyame, amara, Downloads,
// Desktop, Documents, OneDrive). Per explicit user decision, the weights below are
// a documented, calibrated first pass, not sourced from that PRD. Everything lives
// in MATCH_WEIGHTS/DEFAULT_MATCH_THRESHOLD so it's cheap to retune later — never
// hardcode a weight inline elsewhere.

export const DEFAULT_MATCH_THRESHOLD = 60;

export const MATCH_WEIGHTS = {
  skillsMustHave: 25,
  skillsNiceToHave: 10,
  experience: 20,
  rate: 20,
  availability: 15,
  location: 10,
  // Additive on top of the base 100 above, then the total is clamped to 100.
  reliabilityBoost: 3,
  employerReviewBoost: 2,
  // Only applied when verification is a soft signal (requireVerification: false)
  // rather than a hard gate — see scoreCandidate's opts. Rewards a candidate who
  // *is* fully verified for the tier without excluding those who aren't yet,
  // for the window before identity verification (Smile ID) goes live.
  verifiedBoost: 5,
};

const EXPERIENCE_ORDER: ExperienceLevel[] = ['junior', 'mid', 'senior', 'lead'];

export interface ScoringCandidateInput {
  id: string;
  tierPreferences: string[];
  experienceLevel: ExperienceLevel | null;
  rateMin: number | null;
  availabilityDate: string | null; // ISO date
  location: string | null;
  remotePreference: 'remote' | 'hybrid' | 'on_site' | 'flexible' | null;
  reliabilityScore: number | null;
  skillTags: string[];
  verification: VerificationState;
  hasPassedEmployerReview: boolean;
}

export interface ScoringRoleInput {
  tier: Tier;
  experienceLevel: ExperienceLevel | null;
  rateMax: number | null;
  startDate: string | null; // ISO date
  locationType: 'remote' | 'hybrid' | 'on_site' | null;
  locationCity: string | null;
  requiredSkills: { must_have: string[]; nice_to_have: string[] };
}

export interface MatchScoreBreakdown {
  skills: number;
  experience: number;
  rate: number;
  availability: number;
  location: number;
  boosts: number;
}

export interface MatchResult {
  excluded: boolean;
  exclusionReason?: string;
  score: number; // 0 when excluded
  breakdown: MatchScoreBreakdown;
  rateFlag?: boolean;
  // Whether the candidate is fully verified for this role's tier. Always true
  // for a non-excluded result in the default (gate) mode. In relaxed mode
  // (requireVerification: false) it reflects real status, so the UI can badge
  // "not yet verified" candidates while still shortlisting them.
  verified?: boolean;
}

function skillOverlapScore(required: string[], has: string[], weight: number): number {
  if (required.length === 0) return weight; // nothing required -> full credit for this bucket
  const owned = new Set(has.map((s) => s.toLowerCase()));
  const matched = required.filter((s) => owned.has(s.toLowerCase())).length;
  return (matched / required.length) * weight;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Score one candidate against one role. Pure function — no I/O. Hard filters
 * (tier eligibility, tier preference, experience gap, on-site/remote mismatch)
 * short-circuit to `excluded: true` before any point is computed. Gig tier is
 * always excluded by the tier-eligibility filter alone (waitlist-only, Phase 3
 * scoring per the architecture doc) — there is deliberately no Gig-specific
 * scoring path here.
 */
export function scoreCandidate(
  candidate: ScoringCandidateInput,
  role: ScoringRoleInput,
  opts?: { threshold?: number; requireVerification?: boolean },
): MatchResult {
  const threshold = opts?.threshold ?? DEFAULT_MATCH_THRESHOLD;
  const requireVerification = opts?.requireVerification ?? true;
  const zeroBreakdown: MatchScoreBreakdown = { skills: 0, experience: 0, rate: 0, availability: 0, location: 0, boosts: 0 };

  // ── Hard filter 1: verified-badge eligibility for this tier ──
  // Per PRD, unverified candidates never enter scoring. That holds in the
  // default (gate) mode. In relaxed mode — the window before identity
  // verification (Smile ID) is live, when no candidate has any verification
  // records — eligibility becomes a soft signal instead: the candidate is
  // still scored, `verified` records real status, and a boost rewards those
  // who are fully verified. Gig stays excluded either way (it's waitlisted by
  // evaluateEligibility regardless of verification).
  const eligibility = evaluateEligibility(candidate.verification, role.tier);
  const verified = eligibility.eligible;
  if (requireVerification && !eligibility.eligible) {
    return { excluded: true, exclusionReason: eligibility.message, score: 0, breakdown: zeroBreakdown, verified };
  }
  if (!requireVerification && role.tier === 'gig') {
    return { excluded: true, exclusionReason: eligibility.message, score: 0, breakdown: zeroBreakdown, verified };
  }

  // ── Hard filter 2: contract tier preference ──
  // An explicit preference list that omits this tier excludes the candidate.
  // An empty list means "no stated preference" (the state of every migrated
  // candidate) and is treated as open to all tiers, not opted out of all.
  if (candidate.tierPreferences.length > 0 && !candidate.tierPreferences.includes(role.tier)) {
    return { excluded: true, exclusionReason: 'Candidate has not marked this contract tier as open', score: 0, breakdown: zeroBreakdown, verified };
  }

  // ── Hard filter 3: experience two-or-more levels below ──
  if (role.experienceLevel && candidate.experienceLevel) {
    const roleIdx = EXPERIENCE_ORDER.indexOf(role.experienceLevel);
    const candIdx = EXPERIENCE_ORDER.indexOf(candidate.experienceLevel);
    if (roleIdx - candIdx >= 2) {
      return { excluded: true, exclusionReason: 'Experience level too far below role requirement', score: 0, breakdown: zeroBreakdown, verified };
    }
  }

  // Note: no Gig-specific rate rule here. `evaluateEligibility()` above already
  // makes every Gig-tier candidate permanently ineligible (waitlist-only), so a
  // Gig rate check could never actually run — per the architecture doc, Gig-tier
  // scoring logic is explicit Phase 3 scope and shouldn't be built yet, even as
  // unreachable code implying otherwise.

  // ── Hard filter 4: on-site role, remote-only candidate, different city ──
  if (role.locationType === 'on_site' && candidate.remotePreference === 'remote' && candidate.location && role.locationCity) {
    if (!candidate.location.toLowerCase().includes(role.locationCity.toLowerCase())) {
      return { excluded: true, exclusionReason: 'Remote-only candidate, on-site role in a different city', score: 0, breakdown: zeroBreakdown, verified };
    }
  }

  // ── Scored signals ──
  const skills =
    skillOverlapScore(role.requiredSkills.must_have, candidate.skillTags, MATCH_WEIGHTS.skillsMustHave) +
    skillOverlapScore(role.requiredSkills.nice_to_have, candidate.skillTags, MATCH_WEIGHTS.skillsNiceToHave);
  const missingMustHave = role.requiredSkills.must_have.some(
    (s) => !candidate.skillTags.map((t) => t.toLowerCase()).includes(s.toLowerCase()),
  );

  let experience = MATCH_WEIGHTS.experience; // no requirement stated -> full credit
  if (role.experienceLevel && candidate.experienceLevel) {
    const roleIdx = EXPERIENCE_ORDER.indexOf(role.experienceLevel);
    const candIdx = EXPERIENCE_ORDER.indexOf(candidate.experienceLevel);
    const diff = candIdx - roleIdx;
    if (diff === 0 || diff === 1) experience = MATCH_WEIGHTS.experience; // exact or one above -> full
    else if (diff === -1) experience = MATCH_WEIGHTS.experience * 0.5; // one below -> partial
    else if (diff >= 2) experience = MATCH_WEIGHTS.experience * 0.75; // well above -> slightly less than exact
  }

  let rate = MATCH_WEIGHTS.rate * 0.5; // missing data on either side -> neutral
  let rateFlag: boolean | undefined;
  if (role.rateMax !== null && candidate.rateMin !== null) {
    if (candidate.rateMin <= role.rateMax) {
      rate = MATCH_WEIGHTS.rate;
    } else {
      rate = MATCH_WEIGHTS.rate * 0.4; // above budget -> partial credit + flag (Corporate/Short-Term only; Gig already excluded)
      rateFlag = true;
    }
  }

  let availability = MATCH_WEIGHTS.availability * 0.53; // missing candidate availability -> neutral
  if (role.startDate && candidate.availabilityDate) {
    const gap = daysBetween(role.startDate, candidate.availabilityDate);
    if (gap <= 14) availability = MATCH_WEIGHTS.availability;
    else if (gap <= 30) availability = MATCH_WEIGHTS.availability * 0.53;
    else availability = MATCH_WEIGHTS.availability * 0.2; // low credit, never excluded
  }

  let location = 0;
  if (role.locationType === 'remote') {
    location = candidate.remotePreference === 'remote' || candidate.remotePreference === 'flexible'
      ? MATCH_WEIGHTS.location
      : MATCH_WEIGHTS.location * 0.5;
  } else if (role.locationType === 'on_site') {
    if (candidate.remotePreference === 'flexible') location = MATCH_WEIGHTS.location * 0.5;
    else if (candidate.remotePreference === 'on_site') location = MATCH_WEIGHTS.location; // hard filter above already excluded the mismatch case
    else location = MATCH_WEIGHTS.location * 0.5; // unknown/neutral
  } else if (role.locationType === 'hybrid') {
    if (candidate.remotePreference === 'remote') location = MATCH_WEIGHTS.location * 0.3;
    else location = MATCH_WEIGHTS.location;
  } else {
    location = MATCH_WEIGHTS.location * 0.5; // role location unspecified -> neutral
  }

  let boosts = 0;
  if (candidate.reliabilityScore !== null && candidate.reliabilityScore >= 70) boosts += MATCH_WEIGHTS.reliabilityBoost;
  if (candidate.hasPassedEmployerReview) boosts += MATCH_WEIGHTS.employerReviewBoost;
  // In relaxed mode a fully-verified candidate is rewarded rather than being the
  // only kind that gets scored. In gate mode every scored candidate is verified,
  // so this would be noise — skip it.
  if (!requireVerification && verified) boosts += MATCH_WEIGHTS.verifiedBoost;

  let total = skills + experience + rate + availability + location + boosts;
  total = Math.min(100, total);
  if (missingMustHave) total = Math.min(total, 50); // applied last, overrides everything else

  const breakdown: MatchScoreBreakdown = { skills, experience, rate, availability, location, boosts };

  if (total < threshold) {
    return { excluded: true, exclusionReason: `Score ${Math.round(total)} below threshold ${threshold}`, score: Math.round(total), breakdown, rateFlag, verified };
  }

  return { excluded: false, score: Math.round(total), breakdown, rateFlag, verified };
}

export interface ShortlistEntry {
  candidateId: string;
  result: MatchResult;
}

export interface ShortlistAssembly {
  shortlist: ShortlistEntry[]; // top 5
  alternates: ShortlistEntry[]; // next 10
  shallowPool: boolean; // fewer than 5 cleared the threshold
}

/**
 * Sort scored (non-excluded) candidates and split into shortlist (top 5) and
 * alternates (next 10), per PRD §5.3. Never pads with weak matches — if fewer
 * than 5 clear the threshold, `shallowPool` is flagged instead.
 */
export function assembleShortlist(
  entries: { candidateId: string; result: MatchResult }[],
): ShortlistAssembly {
  const eligible = entries.filter((e) => !e.result.excluded).sort((a, b) => b.result.score - a.result.score);
  return {
    shortlist: eligible.slice(0, 5),
    alternates: eligible.slice(5, 15),
    shallowPool: eligible.length < 5,
  };
}
