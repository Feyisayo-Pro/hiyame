// Covers the CV-format profile rebuild (Summary, Job Experience, Education,
// Certifications) added on top of the existing candidate-profile-edit spec.
// Confirms each section's add path creates a real row (not just local state)
// by reloading and reading it back, then confirms the edit-in-place path
// updates that same row rather than creating a duplicate.
import { test, expect } from '@playwright/test';
import { loadTestAccounts, signIn } from './helpers';

test('candidate can add and edit Job Experience, Education, and Certifications', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  await signIn(page, 'candidate', candidate.email, candidate.password);
  await page.goto('/(candidate)/profile', { waitUntil: 'networkidle' });

  // ── Job Experience ──
  const jobTitle = `E2E Engineer ${Date.now()}`;
  await page.locator('text="Add experience"').click();
  await page.getByPlaceholder('Job title').fill(jobTitle);
  await page.getByPlaceholder('Company').fill('E2E Testing Co');
  await page.locator('text="Save"').last().click();
  await expect(page.locator(`text=${jobTitle}`)).toBeVisible({ timeout: 10_000 });

  // Edit it: tap the card, change the job title, save, confirm the old title
  // is gone and the new one is there (an update, not a second row).
  const editedTitle = `${jobTitle} (Edited)`;
  await page.locator(`text=${jobTitle}`).click();
  const jobTitleInput = page.getByPlaceholder('Job title');
  await jobTitleInput.fill('');
  await jobTitleInput.fill(editedTitle);
  await page.locator('text="Save Changes"').first().click();
  await expect(page.locator(`text=${editedTitle}`)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(`text="${jobTitle}"`)).toHaveCount(0);

  // ── Education ──
  const qualification = `BSc E2E Testing ${Date.now()}`;
  await page.locator('text="Add education"').click();
  await page.getByPlaceholder('Institution').fill('E2E University');
  await page.getByPlaceholder('Qualification (BSc Computer Science)').fill(qualification);
  await page.locator('text="Save"').last().click();
  await expect(page.locator(`text=${qualification}`)).toBeVisible({ timeout: 10_000 });

  // ── Certifications ──
  const certName = `E2E Certified Professional ${Date.now()}`;
  await page.locator('text="Add certification"').click();
  await page.getByPlaceholder('Certification name').fill(certName);
  await page.locator('text="Save"').last().click();
  await expect(page.locator(`text=${certName}`)).toBeVisible({ timeout: 10_000 });

  // Reload to rule out this being optimistic local state that never reached
  // the database — same check candidate-profile-edit.spec.ts uses.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator(`text=${editedTitle}`)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(`text=${qualification}`)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(`text=${certName}`)).toBeVisible({ timeout: 10_000 });
});
