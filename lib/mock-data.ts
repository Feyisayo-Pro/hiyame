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
  short_term:  { label: 'Short-Term',   color: '#E0E7FF', accent: '#4F46E5', icon: 'time' },
  gig:         { label: 'Gig',          color: '#F1F5F9', accent: '#64748B', icon: 'flash' },
};
