import { defineConfig } from 'vitest/config';

// Scoped to pure-logic modules only (lib/matchingEngine.ts and similar) — this
// repo has no RN-renderer test setup, and matchingEngine.ts deliberately has
// zero React/RN imports so it doesn't need one.
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
  },
});
