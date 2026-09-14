// Smile ID (the vendor behind the 'identity' verification component) is
// currently paused, so no candidate can complete that component right now.
// Until it's back, the generic "fully verified" badge/banner shown on Home,
// Profile and the Verification Center treats 3 of the 4 components as full,
// so profiles aren't stuck looking permanently incomplete over something
// nobody can currently pass.
//
// This is separate from lib/matchingEngine.ts's tier-eligibility rule, which
// genuinely requires all 4 components for Corporate roles per the
// architecture doc — that rule (and the Corporate/Short-Term eligibility
// chips on the Verification Center) is untouched, and will keep working
// correctly once identity checks resume.
export const FULL_VERIFICATION_THRESHOLD = 3;
export const TOTAL_VERIFICATION_COMPONENTS = 4;
