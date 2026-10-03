// Shared by api/admin-review.ts (server-side gate) and components/TopNav.tsx
// (shows/hides the "Admin" sidebar link). One list so the two never drift —
// see supabase/migrations/20261002090000_account_vetting_status.sql for why
// there's no database table for this yet.
export const ADMIN_EMAILS = ['feyilive@gmail.com', 'hiyame2026@gmail.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === lower);
}
