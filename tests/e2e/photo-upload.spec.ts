// Closes the last gap noted in tests/e2e/README.md. Both upload buttons open
// a real native <input type="file"> via a programmatic .click() (see
// lib/uploadCandidatePhoto.ts / lib/uploadCompanyLogo.ts) rather than any
// custom picker UI, so Playwright's real filechooser event exercises the
// exact same path a real browser file dialog would.
import { test, expect } from '@playwright/test';
import { join } from 'path';
import { loadTestAccounts, signIn } from './helpers';

const TEST_IMAGE = join(__dirname, '..', '..', 'assets', 'images', 'icon.png');

test('candidate can upload a profile photo', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  await signIn(page, 'candidate', candidate.email, candidate.password);
  await page.goto('/(candidate)/profile', { waitUntil: 'networkidle' });

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Change profile photo' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(TEST_IMAGE);

  await expect(page.locator('text=Photo updated')).toBeVisible({ timeout: 15_000 });

  // Confirms the upload actually reached Storage + candidates.photo_url
  // (not just that the picker closed): the avatar now renders an <img>
  // instead of the initials fallback it showed before any photo existed.
  await expect(page.getByRole('button', { name: 'Change profile photo' }).locator('img')).toBeVisible({ timeout: 10_000 });
});

test('company can upload a logo', async ({ page }) => {
  const { company } = loadTestAccounts();
  await signIn(page, 'company', company.email, company.password);
  await page.goto('/(company)/profile', { waitUntil: 'networkidle' });

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Change company logo' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(TEST_IMAGE);

  await expect(page.locator('text=Logo updated')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Change company logo' }).locator('img')).toBeVisible({ timeout: 10_000 });
});
