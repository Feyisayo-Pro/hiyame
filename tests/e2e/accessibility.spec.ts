// Automated a11y sweep with axe-core across the pages a real visitor or
// signed-in user actually lands on — public marketing pages (what an
// unauthenticated visitor and search engines see), the auth screens (the
// only UI a screen-reader user needs to get through to use the product at
// all), and both signed-in Home dashboards. Scoped to wcag2a/wcag2aa/best
// practice rules — the same baseline axe's own Playwright quickstart
// recommends — rather than every experimental rule, so failures here are
// real, actionable violations rather than noise.
//
// 'region' (moderate) is disabled deliberately, not overlooked: React
// Native Web renders every screen as generic <div>s with no ARIA landmarks
// (<main>/<nav>/etc.), so this rule fires broadly across the entire app —
// a real, known gap, but a much bigger architectural change (an
// accessibilityRole="main"-equivalent wrapper on every screen) than this
// pass covers. Tracked as a known follow-up rather than silently ignored.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadTestAccounts, signIn } from './helpers';

const DEFERRED_RULES = ['region'];

// Lets entrance animations (SwipeFadeContainer et al) finish before
// scanning — without this, axe catches text mid-fade at partial opacity and
// reports real-looking "insufficient contrast" violations that are just
// animation frames, not the page's resting state a user actually reads.
// welcome.tsx's staggered multi-panel sequence plus its async live-stats
// fetch needs longer than the ~420ms base entrance duration to fully settle
// (confirmed empirically — 700ms still caught 19 phantom violations there,
// 3000ms caught 0).
const SETTLE_MS = 3000;

const PUBLIC_PAGES = [
  '/(auth)/welcome',
  '/(auth)/pricing',
  '/(auth)/about',
  '/(auth)/how-it-works',
  '/(auth)/candidate-signin',
  '/(auth)/candidate-signup',
  '/(auth)/company-signin',
  '/(auth)/company-signup',
];

for (const path of PUBLIC_PAGES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(SETTLE_MS);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .disableRules(DEFERRED_RULES)
      .analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}

test('a11y: candidate Home (signed in)', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  await signIn(page, 'candidate', candidate.email, candidate.password);
  await page.waitForTimeout(SETTLE_MS);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .disableRules(DEFERRED_RULES)
    .analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});

test('a11y: company Home (signed in)', async ({ page }) => {
  const { company } = loadTestAccounts();
  await signIn(page, 'company', company.email, company.password);
  await page.waitForTimeout(SETTLE_MS);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .disableRules(DEFERRED_RULES)
    .analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});

// The app defaults every session to light mode and only reaches dark mode
// via this in-app toggle (no OS-preference detection, nothing persisted) —
// so emulating a dark colorScheme at the browser level wouldn't exercise it.
// Added after a real bug this sweep caught: dark theme's own `textMuted`
// token was never checked against dark backgrounds and failed 3.4-3.9:1.
test('a11y: candidate Home, dark mode', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  await signIn(page, 'candidate', candidate.email, candidate.password);
  await page.getByText('Dark mode', { exact: true }).click();
  await page.waitForTimeout(SETTLE_MS);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .disableRules(DEFERRED_RULES)
    .analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});

// axe's default failure message is a wall of JSON — this collapses it to
// one line per violation (rule id, impact, how many nodes, and the fix
// hint) so a failing CI run tells you what to fix without opening the trace.
function formatViolations(violations: import('axe-core').Result[]): string {
  if (violations.length === 0) return '';
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`)
    .join('\n');
}
