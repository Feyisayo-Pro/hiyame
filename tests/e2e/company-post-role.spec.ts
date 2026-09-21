// Covers the "+ Post a Role" flow added in the role-creation-UI milestone —
// the gap that used to leave a fresh company signup with no way to ever
// post a role. Confirms the form actually creates a real `roles` row and
// navigates to that role's shortlist. Does NOT assert the shortlist gets
// populated: self-serve matching only runs via the operator-invoked
// scripts/run-matching.ts (a documented, real limitation, not a bug), so an
// empty shortlist here is the correct, expected outcome for a brand-new
// role — the same thing a live QA pass confirmed earlier this session.
import { test, expect } from '@playwright/test';
import { loadTestAccounts, signIn } from './helpers';

test('company can post a role and land on its shortlist', async ({ page }) => {
  const { company } = loadTestAccounts();
  await signIn(page, 'company', company.email, company.password);

  await page.goto('/(company)/roles', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Post a role' }).first().click();
  await expect(page).toHaveURL(/create-role/);

  const roleTitle = `E2E Test Role ${Date.now()}`;
  await page.getByPlaceholder('Senior Backend Engineer').fill(roleTitle);
  await page.getByPlaceholder('What will this person actually do? What makes the role compelling?').fill(
    'A throwaway role posted by the automated E2E suite to verify the create-role flow end to end.'
  );

  // The submit button has no accessibilityRole set, so it doesn't expose an
  // ARIA button role on web — match its exact text instead. "Post Role" is
  // deliberately distinct from "Post a Role" (the nav button/header text
  // elsewhere on this screen) so this can't collide with them.
  await page.locator('text="Post Role"').click();

  // Lands on the shortlist screen for the role just created.
  await expect(page).toHaveURL(/shortlist/, { timeout: 15_000 });

  // Confirm the role really exists (not just a client-side navigation) by
  // going back to My Roles and finding it in the real list.
  await page.goto('/(company)/roles', { waitUntil: 'networkidle' });
  await expect(page.locator(`text=${roleTitle}`)).toBeVisible({ timeout: 10_000 });
});
