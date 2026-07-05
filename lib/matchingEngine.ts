import { VerificationState } from './useVerification';
import { Tier } from './mock-data';

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
