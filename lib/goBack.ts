import type { useRouter } from 'expo-router';

// router.back() silently no-ops when there's no navigation history to go
// back to — e.g. landing directly on a screen via a link/bookmark, or after
// AuthGate's router.replace() (app/_layout.tsx) wipes history. Every back
// button in the app calls this instead of router.back() directly, so it
// falls back to a known-good route rather than looking broken.
export function goBack(router: ReturnType<typeof useRouter>, fallback: string) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
