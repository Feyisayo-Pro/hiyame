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

// Regression test for a second, distinct persona bug (reported repeatedly,
// fixed 2026-09-29, then corrected same-day after live feedback):
// candidate-signin.tsx and company-signin.tsx each used to call
// router.replace() to their own persona's home right after any successful
// supabase.auth.signInWithPassword() call — but sign-in authenticates
// against the same auth.users table regardless of which of the two screens
// you're on, so a company account signing in through /candidate-signin
// (wrong link, bookmark, muscle memory) got hard-routed into (candidate)
// anyway. First fix let AuthGate route by the real resolved role instead —
// correct, but silently dropping a company account into the candidate UI
// (or vice versa) still read as broken/unprofessional to a real user rather
// than "helpfully redirected". Final behavior: reject the mismatch outright
// with a specific message and sign back out, instead of ever navigating a
// company account into the candidate section or vice versa.
test.describe('sign-in screen rejects a real-role mismatch instead of redirecting to it', () => {
  test('a company email on /candidate-signin is rejected, not redirected', async ({ page }) => {
    const { company } = loadTestAccounts();
    await page.goto('/(auth)/candidate-signin', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', company.email);
    await page.fill('input[type="password"]', company.password);
    const signInButtons = await page.$$('text=Sign In');
    await signInButtons[signInButtons.length - 1].click();

    await expect(page.locator('text=This is a company email. Sign in from the company page instead.')).toBeVisible({ timeout: 15_000 });
    // Still on the candidate sign-in screen, not signed in anywhere.
    await expect(page).toHaveURL(/candidate-signin/);
    await expect(page.locator('text=Sign out')).toHaveCount(0);
  });

  test('a candidate email on /company-signin is rejected, not redirected', async ({ page }) => {
    const { candidate } = loadTestAccounts();
    await page.goto('/(auth)/company-signin', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', candidate.email);
    await page.fill('input[type="password"]', candidate.password);
    const signInButtons = await page.$$('text=Sign In');
    await signInButtons[signInButtons.length - 1].click();

    await expect(page.locator('text=This is a candidate email. Sign in from the candidate page instead.')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/company-signin/);
    await expect(page.locator('text=Sign out')).toHaveCount(0);
  });

  test('a candidate signing in via /candidate-signin still lands on candidate Home', async ({ page }) => {
    const { candidate } = loadTestAccounts();
    await signIn(page, 'candidate', candidate.email, candidate.password);
    await expect(page.getByText('Candidate', { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('a company account signing in via /company-signin still lands on company Home', async ({ page }) => {
    const { company } = loadTestAccounts();
    await signIn(page, 'company', company.email, company.password);
    await expect(page.getByText('Company', { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
