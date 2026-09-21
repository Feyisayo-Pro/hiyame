// Regression test for the bug reported and fixed 2026-09-21: (candidate) and
// (company) route groups declare routes with identical leaf names (index,
// profile, settings, ...), and on a cold page load Expo Router's web
// resolver rendered whichever group it found first — independent of the
// signed-in user's real role. A candidate reload could land on the company
// Home, or vice versa. Fixed centrally in AuthGate (app/_layout.tsx), which
// this test exercises directly: sign in, reload, confirm the persona held.
import { test, expect } from '@playwright/test';
import { loadTestAccounts, signIn } from './helpers';

test.describe('persona guard survives a reload', () => {
  test('candidate reload stays on candidate Home', async ({ page }) => {
    const { candidate } = loadTestAccounts();
    await signIn(page, 'candidate', candidate.email, candidate.password);

    await page.reload({ waitUntil: 'networkidle' });

    // Sidebar identifies the account by persona label — this is what
    // actually flipped during the bug (company account, candidate sidebar).
    // Exact match: a loose substring match on "Candidate" also hits public
    // marketing copy ("FOR CANDIDATES", "...verified candidate...") that a
    // reload can transiently leave in the DOM mid-hydration.
    await expect(page.getByText('Candidate', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=Verification Checklist')).toBeVisible();
    await expect(page.locator('text=Discover')).toHaveCount(0);
  });

  test('company reload stays on company Home', async ({ page }) => {
    const { company } = loadTestAccounts();
    await signIn(page, 'company', company.email, company.password);

    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.getByText('Company', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=Open Roles')).toBeVisible();
    await expect(page.locator('text=Verification Checklist')).toHaveCount(0);
  });
});
