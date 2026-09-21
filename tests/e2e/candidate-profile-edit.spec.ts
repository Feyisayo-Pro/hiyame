// Closes the gap noted in tests/e2e/README.md: candidate profile editing
// was QA'd manually earlier this session (found real bugs at the time —
// see the persona-guard fix) but never converted into a committed spec.
// Covers the actual save path: open the edit modal, change the name and
// add a skill, save, and confirm the real `candidates` row changed (not
// just that the modal closed) by reloading and reading it back from the
// profile screen's own display.
import { test, expect } from '@playwright/test';
import { loadTestAccounts, signIn } from './helpers';

test('candidate can edit their profile and the change persists', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  await signIn(page, 'candidate', candidate.email, candidate.password);

  await page.goto('/(candidate)/profile', { waitUntil: 'networkidle' });
  await page.locator('text=Edit Profile').click();
  await expect(page.locator('text="Save Changes"')).toBeVisible();

  const newName = `E2E Edited Candidate ${Date.now()}`;
  const nameInput = page.getByPlaceholder('Your name');
  await nameInput.fill('');
  await nameInput.fill(newName);

  const skillInput = page.getByPlaceholder('Type a skill and press add');
  await skillInput.fill('Rust');
  await skillInput.press('Enter');
  await expect(page.locator('text=Rust')).toBeVisible();

  await page.locator('text="Save Changes"').click();

  // The modal's own success toast, then the profile screen's header
  // reflecting the new name without a reload — both real signals the save
  // actually landed, not just that the modal closed.
  await expect(page.locator('text=Profile updated')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(`text=${newName}`).first()).toBeVisible();

  // Reload to rule out this just being optimistic local state that never
  // reached the database.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator(`text=${newName}`).first()).toBeVisible({ timeout: 10_000 });
});
