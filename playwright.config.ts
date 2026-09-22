import { defineConfig, devices } from '@playwright/test';
import { E2E_BASE_URL } from './tests/e2e/testEnv';

// E2E suite against the real deployed app + real Supabase backend (no mocks —
// this app has no meaningful logic left once you stub out the network calls).
// Runs serially: every spec shares two throwaway accounts provisioned by
// global-setup, and the company spec mutates that account's own data
// (posts a role), so parallel specs racing on the same account would be
// flaky by construction, not a real bug.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Fake camera/mic device + auto-accepted permission prompt — lets
        // verification-checklist.spec.ts's video-intro test drive a real
        // getUserMedia()/MediaRecorder() flow without a physical webcam.
        // No effect on any other spec (a page that never calls
        // getUserMedia never sees a prompt either way).
        launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
        permissions: ['camera', 'microphone'],
      },
    },
  ],
});
