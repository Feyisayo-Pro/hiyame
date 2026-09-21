import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from './useAuth';

// Real bug, found while QA-ing both profile screens: (candidate) and
// (company) each define a route with the same leaf name for 7 screens
// (profile, settings, notifications, messages, analytics, help, legal) —
// route groups are stripped from the actual URL, so both compile to the
// same bare path (e.g. "/profile"). That's invisible during normal in-app
// navigation (Expo Router already has the right screen mounted from the
// tab you tapped), but a *fresh* page load at that URL — a reload, a typed
// address, a bookmark, a shared link — has to resolve the bare path from
// scratch, and it always picks (candidate)'s version (confirmed live:
// reloading /profile while signed in as a real company account renders
// the candidate's profile screen and sidebar, not the company's).
//
// Call this at the top of each of the 14 affected screens with the
// persona it actually belongs to. Once the real session resolves, it
// silently redirects to the same leaf under the correct group if they
// don't match — a company user who reloads on /profile lands back on
// their own profile, not the candidate's.
export function usePersonaGuard(expected: 'candidate' | 'company'): void {
  const { role, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !role || role === expected) return;
    router.replace(`/(${role})${pathname}` as any);
  }, [loading, role, expected, pathname, router]);
}
