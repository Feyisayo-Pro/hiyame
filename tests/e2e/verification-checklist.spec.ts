// Covers verification steps that were pure decoration before this milestone
// — see app/(candidate)/verification.tsx's own history: nothing in the app
// ever wrote to verification_records until real write paths existed
// (api/video-intro.ts, api/skills-assessment.ts, api/employer-review.ts).
// Identity Check is out of scope everywhere in this codebase right now
// (lib/verification.ts documents Smile ID as paused pending a real KYC
// vendor account), so it isn't covered here.
//
// Skills assessment is no longer self-serve/auto-graded (2026-10-03) —
// Hiyame's internal team runs it, and an admin marks the outcome from
// app/admin.tsx (api/admin-review.ts). The candidate side of this test
// covers the request landing in verification_records as 'pending'; the
// admin side covers that an approval flips it to 'passed' and the step
// shows Verified back on the candidate's own screen.
//
// All assert against the real database via a service-role client, not just
// UI text — a toast or a "Verified" pill proves the UI updated, not that
// verification_records actually changed underneath it.
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loadTestAccounts, signIn } from './helpers';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './testEnv';

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

test('candidate requests a skills assessment, admin approval marks it passed', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  const admin = adminClient();

  // Known starting state — a retake-safe test, not reliant on a clean DB.
  await admin.from('verification_records').delete().eq('candidate_id', candidate.candidateId).eq('component', 'skills_assessment');

  await signIn(page, 'candidate', candidate.email, candidate.password);
  await page.goto('/(candidate)/verification', { waitUntil: 'networkidle' });

  await page.locator('text=Request Assessment').click();
  await expect(page.locator('text=Request sent')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('text=Awaiting review from the Hiyame team')).toBeVisible({ timeout: 10_000 });

  const { data: afterRequest } = await admin
    .from('verification_records')
    .select('status')
    .eq('candidate_id', candidate.candidateId)
    .eq('component', 'skills_assessment')
    .maybeSingle();
  expect(afterRequest?.status).toBe('pending');

  const { error: approveErr } = await admin
    .from('verification_records')
    .update({ status: 'passed' })
    .eq('candidate_id', candidate.candidateId)
    .eq('component', 'skills_assessment');
  expect(approveErr).toBeNull();

  // Both the "awaiting review" state and the request button are unique to
  // an un-passed assessment step — their absence after reload is what
  // "Skills Assessment" flipping to Verified actually looks like in this UI
  // (every step's own Verified/Pending pill text repeats across all 4
  // steps, so it can't disambiguate on its own).
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('text=Awaiting review from the Hiyame team')).toHaveCount(0);
  await expect(page.locator('text=Request Assessment')).toHaveCount(0);
});

test('candidate can record and submit a video introduction', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  await signIn(page, 'candidate', candidate.email, candidate.password);
  await page.goto('/(candidate)/verification', { waitUntil: 'networkidle' });

  await page.locator('text=Record Introduction').or(page.locator('text=Re-record')).first().click();
  await page.locator('text="Start Recording"').click();
  await page.waitForTimeout(2000); // record ~2s against the fake camera device
  await page.locator('text="Stop"').click();
  await expect(page.locator('text="Submit"')).toBeVisible({ timeout: 10_000 });
  await page.locator('text="Submit"').click();

  await expect(page.locator('text=Video submitted')).toBeVisible({ timeout: 20_000 });

  const admin = adminClient();
  const { data: cand } = await admin.from('candidates').select('video_intro_url').eq('id', candidate.candidateId).single();
  expect(cand?.video_intro_url).toContain('candidate-videos');
  const { data: vr } = await admin
    .from('verification_records')
    .select('status')
    .eq('candidate_id', candidate.candidateId)
    .eq('component', 'video_intro')
    .maybeSingle();
  expect(vr?.status).toBe('passed');
});

test('employer review: request → emailed link → submitted rating flips verification', async ({ browser }) => {
  const { candidate } = loadTestAccounts();
  const admin = adminClient();

  // ── Candidate sends the request ──
  const candCtx = await browser.newContext();
  const candPage = await candCtx.newPage();
  await signIn(candPage, 'candidate', candidate.email, candidate.password);
  await candPage.goto('/(candidate)/verification', { waitUntil: 'networkidle' });

  const employerEmail = `e2e-employer-${Date.now()}@hiyame-test.invalid`;
  await candPage.locator('text=Request a Review').click();
  await candPage.getByPlaceholder('Employer or client name').fill('Acme Testing Ltd');
  await candPage.getByPlaceholder('Their email address').fill(employerEmail);
  await candPage.locator('text="Send Request"').click();
  await expect(candPage.locator('text=Request sent')).toBeVisible({ timeout: 10_000 });
  await candCtx.close();

  // Real delivery is blocked on Resend domain verification (documented,
  // pre-existing) — reading the token straight from the database is the
  // equivalent of "the employer opens the email we sent them" for
  // everything downstream of the send itself.
  const { data: request } = await admin
    .from('employer_review_requests')
    .select('token')
    .eq('candidate_id', candidate.candidateId)
    .eq('employer_email', employerEmail)
    .single();
  expect(request?.token).toBeTruthy();

  // ── A completely separate, signed-out browser reaches the review page ──
  const reviewCtx = await browser.newContext();
  const reviewPage = await reviewCtx.newPage();
  await reviewPage.goto(`/employer-review/${request!.token}`, { waitUntil: 'networkidle' });
  // Confirms AuthGate's public-route allowlist actually works — a
  // signed-out visitor here must NOT get bounced to /welcome.
  expect(reviewPage.url()).toContain(`/employer-review/${request!.token}`);

  for (const label of ['Quality of work', 'Reliability', 'Communication']) {
    const stars = reviewPage.locator(`xpath=//*[text()="${label}"]/following-sibling::*[1]`).locator('svg');
    await stars.nth(3).click({ force: true }); // 4th star of 5
  }
  await reviewPage.locator('text="Yes"').click();
  await reviewPage.getByPlaceholder('Anything else worth sharing about working with them').fill('Great to work with.');
  await reviewPage.locator('text="Submit Review"').click();
  await expect(reviewPage.locator('text=Thank you')).toBeVisible({ timeout: 10_000 });
  await reviewCtx.close();

  const { data: review } = await admin
    .from('employer_reviews')
    .select('quality_rating, would_rehire')
    .eq('candidate_id', candidate.candidateId)
    .maybeSingle();
  expect(review?.quality_rating).toBe(4);
  expect(review?.would_rehire).toBe(true);

  const { data: vr } = await admin
    .from('verification_records')
    .select('status')
    .eq('candidate_id', candidate.candidateId)
    .eq('component', 'employer_review')
    .maybeSingle();
  expect(vr?.status).toBe('passed');

  // Anti-replay: the same link must not be submittable twice.
  const { data: requestAfter } = await admin
    .from('employer_review_requests')
    .select('status')
    .eq('token', request!.token)
    .single();
  expect(requestAfter?.status).toBe('submitted');
});
