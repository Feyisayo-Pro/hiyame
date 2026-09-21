import { Page, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { E2EAccounts } from './global-setup';

export function loadTestAccounts(): E2EAccounts {
  return JSON.parse(readFileSync(join(__dirname, '.auth', 'accounts.json'), 'utf8'));
}

// Signs in through the real UI (not a stubbed session) — every spec in this
// suite is exercising the actual sign-in screen, not just what comes after
// it. `text=Sign In` ambiguously matches the auth screens' own subtitle
// copy ("...sign in to continue") as well as the real button, so this picks
// the last match rather than using Playwright's strict-mode locator.click().
export async function signIn(page: Page, persona: 'candidate' | 'company', email: string, password: string) {
  await page.goto(`/(auth)/${persona}-signin`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  const signInButtons = await page.$$('text=Sign In');
  await signInButtons[signInButtons.length - 1].click();
  await expect(page.locator('text=Sign out')).toBeVisible({ timeout: 15_000 });
}
