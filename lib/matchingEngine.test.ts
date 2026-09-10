import { describe, it, expect } from 'vitest';
import {
  scoreCandidate,
  assembleShortlist,
  DEFAULT_MATCH_THRESHOLD,
  ScoringCandidateInput,
  ScoringRoleInput,
} from './matchingEngine';
import { VerificationState } from './useVerification';

const FULLY_VERIFIED: VerificationState = {
  identityVerified: true,
  videoIntroUploaded: true,
  assessmentCompleted: true,
  employerReviewSecured: true,
};

const UNVERIFIED: VerificationState = {
  identityVerified: false,
  videoIntroUploaded: false,
  assessmentCompleted: false,
  employerReviewSecured: false,
};

function baseCandidate(overrides: Partial<ScoringCandidateInput> = {}): ScoringCandidateInput {
  return {
    id: 'cand-1',
    tierPreferences: ['corporate'],
    experienceLevel: 'senior',
    rateMin: 4000,
    availabilityDate: '2026-08-01',
    location: 'Lagos, Nigeria',
    remotePreference: 'remote',
    reliabilityScore: 80,
    skillTags: ['IFRS', 'Financial Reporting', 'SAP'],
    verification: FULLY_VERIFIED,
    hasPassedEmployerReview: true,
    ...overrides,
  };
}

function baseRole(overrides: Partial<ScoringRoleInput> = {}): ScoringRoleInput {
  return {
    tier: 'corporate',
    experienceLevel: 'senior',
    rateMax: 7000,
    startDate: '2026-08-05',
    locationType: 'remote',
    locationCity: null,
    requiredSkills: { must_have: ['IFRS', 'Financial Reporting', 'SAP'], nice_to_have: ['CPA'] },
    ...overrides,
  };
}

describe('scoreCandidate — hard filters', () => {
  it('excludes unverified candidates before any scoring', () => {
    const result = scoreCandidate(baseCandidate({ verification: UNVERIFIED }), baseRole());
    expect(result.excluded).toBe(true);
    expect(result.score).toBe(0);
  });

  it('excludes candidates who have not marked the role tier as open', () => {
    const result = scoreCandidate(baseCandidate({ tierPreferences: ['short_term'] }), baseRole({ tier: 'corporate' }));
    expect(result.excluded).toBe(true);
    expect(result.exclusionReason).toMatch(/tier/i);
  });

  it('excludes candidates two or more experience levels below the role', () => {
    const result = scoreCandidate(
      baseCandidate({ experienceLevel: 'junior', tierPreferences: ['corporate'] }),
      baseRole({ experienceLevel: 'lead' }),
    );
    expect(result.excluded).toBe(true);
    expect(result.exclusionReason).toMatch(/experience/i);
  });

  it('does NOT exclude a candidate only one level below (partial credit instead)', () => {
    const result = scoreCandidate(
      baseCandidate({ experienceLevel: 'mid', tierPreferences: ['corporate'] }),
      baseRole({ experienceLevel: 'senior' }),
    );
    expect(result.excluded).toBe(false);
    expect(result.breakdown.experience).toBeLessThan(20);
    expect(result.breakdown.experience).toBeGreaterThan(0);
  });

  it('Gig tier is always excluded regardless of fit — waitlist-only, no scoring path (Phase 3 per architecture doc)', () => {
    // Deliberately a well-qualified candidate on every other dimension — Gig
    // exclusion must come from tier eligibility alone, not from any rate/skill/
    // experience shortfall, since no Gig-specific scoring logic exists at all.
    const result = scoreCandidate(
      baseCandidate({ tierPreferences: ['gig'], rateMin: 10 }),
      baseRole({ tier: 'gig', rateMax: 10000 }),
    );
    expect(result.excluded).toBe(true);
    expect(result.exclusionReason).toMatch(/waitlist/i);
  });

  it('Corporate/Short-Term get a soft flag for a rate gap that would matter if Gig scoring existed', () => {
    const result = scoreCandidate(
      baseCandidate({ rateMin: 100, tierPreferences: ['corporate'] }),
      baseRole({ tier: 'corporate', rateMax: 50 }),
    );
    expect(result.excluded).toBe(false);
    expect(result.rateFlag).toBe(true);
    expect(result.breakdown.rate).toBeGreaterThan(0);
    expect(result.breakdown.rate).toBeLessThan(20);
  });

  it('excludes a remote-only candidate from an on-site role in a different city', () => {
    const result = scoreCandidate(
      baseCandidate({ remotePreference: 'remote', location: 'Nairobi, Kenya', tierPreferences: ['corporate'] }),
      baseRole({ locationType: 'on_site', locationCity: 'Lagos' }),
    );
    expect(result.excluded).toBe(true);
    expect(result.exclusionReason).toMatch(/remote|city/i);
  });

  it('does not hard-exclude an on-site role when the candidate location is unknown', () => {
    const result = scoreCandidate(
      baseCandidate({ remotePreference: 'remote', location: null, tierPreferences: ['corporate'] }),
      baseRole({ locationType: 'on_site', locationCity: 'Lagos' }),
    );
    expect(result.excluded).toBe(false);
  });
});

describe('scoreCandidate — relaxed mode (pre-verification window)', () => {
  it('still hard-excludes an unverified candidate by default', () => {
    const result = scoreCandidate(baseCandidate({ verification: UNVERIFIED }), baseRole());
    expect(result.excluded).toBe(true);
  });

  it('scores an unverified candidate when requireVerification is false, marking them not verified', () => {
    const result = scoreCandidate(
      baseCandidate({ verification: UNVERIFIED }),
      baseRole(),
      { requireVerification: false },
    );
    expect(result.excluded).toBe(false);
    expect(result.verified).toBe(false);
    expect(result.score).toBeGreaterThan(DEFAULT_MATCH_THRESHOLD);
  });

  it('rewards a fully-verified candidate over an identical unverified one in relaxed mode', () => {
    const verified = scoreCandidate(baseCandidate({ verification: FULLY_VERIFIED }), baseRole(), { requireVerification: false });
    const unverified = scoreCandidate(baseCandidate({ verification: UNVERIFIED }), baseRole(), { requireVerification: false });
    expect(verified.verified).toBe(true);
    expect(verified.score).toBeGreaterThan(unverified.score);
  });

  it('keeps Gig waitlisted even in relaxed mode', () => {
    const result = scoreCandidate(
      baseCandidate({ verification: UNVERIFIED, tierPreferences: [] }),
      baseRole({ tier: 'gig' }),
      { requireVerification: false },
    );
    expect(result.excluded).toBe(true);
    expect(result.exclusionReason).toMatch(/waitlist/i);
  });

  it('treats an empty tierPreferences list as open to all tiers, not opted out', () => {
    const result = scoreCandidate(
      baseCandidate({ tierPreferences: [] }),
      baseRole({ tier: 'corporate' }),
    );
    expect(result.excluded).toBe(false);
  });

  it('still excludes when a non-empty tierPreferences list omits the role tier', () => {
    const result = scoreCandidate(
      baseCandidate({ tierPreferences: ['short_term'] }),
      baseRole({ tier: 'corporate' }),
    );
    expect(result.excluded).toBe(true);
    expect(result.exclusionReason).toMatch(/tier/i);
  });
});

describe('scoreCandidate — scoring rules', () => {
  it('caps the score at 50 when a must-have skill is missing, even with a perfect fit on every other signal', () => {
    // A lowered threshold isolates the cap itself from the (correct, separate)
    // threshold exclusion — at the default threshold of 60, a 50-cap candidate
    // is excluded anyway, which is covered by the next test.
    const result = scoreCandidate(
      baseCandidate({ skillTags: ['IFRS'] /* missing Financial Reporting + SAP */ }),
      baseRole(),
      { threshold: 0 },
    );
    expect(result.excluded).toBe(false);
    expect(result.score).toBeLessThanOrEqual(50);
  });

  it('a missing must-have skill fails the default threshold too, since the 50-cap sits below it', () => {
    const result = scoreCandidate(
      baseCandidate({ skillTags: ['IFRS'] }),
      baseRole(),
    );
    expect(result.excluded).toBe(true);
    expect(result.score).toBeLessThanOrEqual(50);
  });

  it('scores a fully-matching candidate well above the default threshold', () => {
    const result = scoreCandidate(baseCandidate(), baseRole());
    expect(result.excluded).toBe(false);
    expect(result.score).toBeGreaterThan(DEFAULT_MATCH_THRESHOLD);
  });

  it('excludes a candidate whose total score falls below the configured threshold', () => {
    // Weak on every soft signal but still verified/eligible/tier-open: partial
    // skills, one level below on experience, over budget, far availability gap.
    const result = scoreCandidate(
      baseCandidate({
        skillTags: [],
        experienceLevel: 'mid',
        rateMin: 9000,
        availabilityDate: '2027-01-01',
      }),
      baseRole({ experienceLevel: 'senior', rateMax: 7000, startDate: '2026-08-05' }),
    );
    expect(result.excluded).toBe(true);
    expect(result.exclusionReason).toMatch(/threshold/i);
  });

  it('respects a custom threshold override', () => {
    const candidate = baseCandidate({ skillTags: [] });
    const role = baseRole();
    const lenient = scoreCandidate(candidate, role, { threshold: 0 });
    expect(lenient.excluded).toBe(false);
  });
});

describe('assembleShortlist', () => {
  it('splits into top-5 shortlist and next-10 alternates, sorted by score', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      candidateId: `c${i}`,
      result: { excluded: false, score: i, breakdown: { skills: 0, experience: 0, rate: 0, availability: 0, location: 0, boosts: 0 } },
    }));
    const { shortlist, alternates, shallowPool } = assembleShortlist(entries);
    expect(shortlist).toHaveLength(5);
    expect(alternates).toHaveLength(10);
    expect(shallowPool).toBe(false);
    expect(shortlist[0].candidateId).toBe('c19'); // highest score first
    expect(shortlist[4].candidateId).toBe('c15');
    expect(alternates[0].candidateId).toBe('c14');
  });

  it('flags a shallow pool instead of padding when fewer than 5 clear the threshold', () => {
    const entries = [
      { candidateId: 'a', result: { excluded: false, score: 90, breakdown: { skills: 0, experience: 0, rate: 0, availability: 0, location: 0, boosts: 0 } } },
      { candidateId: 'b', result: { excluded: true, score: 0, breakdown: { skills: 0, experience: 0, rate: 0, availability: 0, location: 0, boosts: 0 } } },
    ];
    const { shortlist, shallowPool } = assembleShortlist(entries);
    expect(shortlist).toHaveLength(1);
    expect(shallowPool).toBe(true);
  });
});
