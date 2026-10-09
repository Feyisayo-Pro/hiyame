// Corporate = large enterprise (500+ headcount, institutional)
// Short-Term = contract/project-based engagements
// Gig = freelance tasks, waitlisted until matching goes live
export type Tier = 'corporate' | 'short_term' | 'gig';
export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'lead';

// ── Tier presentation config (shared across screens) ──────────────────
export const TIER_CONFIG: Record<Tier, {
  label: string;
  color: string;     // card background
  accent: string;    // badges, icons, CTAs
  icon: string;      // Ionicons name
}> = {
  corporate:   { label: 'Corporate',    color: '#D1FAE5', accent: '#059669', icon: 'business' },
  short_term:  { label: 'Short-Term',   color: '#E0E7FF', accent: '#4F46E5', icon: 'time-outline' },
  gig:         { label: 'Gig',          color: '#F1F5F9', accent: '#64748B', icon: 'flash' },
};

// Response-window hours per tier (architecture doc §7.4) — how long the
// receiving side has to respond before an introduction expires. Used by
// both who can send one: app/(company)/shortlist.tsx (company → candidate)
// and app/(candidate)/opportunities.tsx (candidate → company, applying).
export const RESPONSE_WINDOW_HOURS: Record<Tier, number> = {
  corporate: 72,
  short_term: 48,
  gig: 24,
};
