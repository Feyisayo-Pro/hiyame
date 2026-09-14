import * as Sentry from '@sentry/react-native';

// Crash/performance monitoring (architecture doc ADR-5). No Sentry project
// exists for this app yet — DSN is read from an env var so this activates
// the moment one is set (Dashboard → Settings → Client Keys (DSN) on
// sentry.io, then set EXPO_PUBLIC_SENTRY_DSN), with zero further code
// changes. Until then this is a documented no-op, not a placeholder that
// silently does nothing without saying so.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!DSN) {
    console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash/performance monitoring is disabled.');
    return;
  }
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 1.0,
    // Session Replay is opt-in and off by default here — enable deliberately
    // if/when it's actually wanted, since it captures UI content.
    enableAutoSessionTracking: true,
  });
}

export { Sentry };
