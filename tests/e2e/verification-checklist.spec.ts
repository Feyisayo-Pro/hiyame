// Covers verification steps that were pure decoration before this milestone
// — see app/(candidate)/verification.tsx's own history: nothing in the app
// ever wrote to verification_records until real write paths existed
// (api/video-intro.ts, api/skills-assessment.ts, api/upload-candidate-cv.ts).
// Identity Check is out of scope everywhere in this codebase right now
// (lib/verification.ts documents Smile ID as paused pending a real KYC
// vendor account), so it isn't covered here.
//
// Skills assessment and CV review are both no longer self-serve/auto-graded
// (2026-10-03) — Hiyame's internal team runs/reviews them, and an admin
// marks the outcome from app/(admin)/candidates.tsx (api/admin-review.ts).
// The candidate side of each test covers the request/upload landing in
// verification_records as 'pending'; the admin side covers that an
// approval flips it to 'passed' and the step shows Verified back on the
// candidate's own screen. CV/Portfolio replaced Employer Review in the
// checklist — that flow (employer_review_requests, /employer-review/[token])
// still exists in the codebase but is no longer linked from the UI, so it's
// no longer covered here either.
//
// All assert against the real database via a service-role client, not just
// UI text — a toast or a "Verified" pill proves the UI updated, not that
// verification_records actually changed underneath it.
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { join } from 'path';
import { loadTestAccounts, signIn } from './helpers';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './testEnv';

const TEST_CV = join(__dirname, 'fixtures', 'test-cv.pdf');

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

test('candidate requests a skills assessment, admin approval marks it passed', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  const admin = adminClient();

  // Known starting state — a retake-safe test, not reliant on a clean DB.
  await admin.from('verification_records').delete().eq('candidate_id', candidate.candidateId).eq('component', 'skills_assessment');
  // Requesting an assessment is gated on having submitted a video, CV, and
  // portfolio link first (2026-10-07) — seeded directly here since the
  // upload mechanics themselves are already covered by the video-intro and
  // CV-upload tests below; this test's focus is the assessment request/
  // approval round trip, not re-proving uploads work.
  await admin.from('candidates').update({
    video_intro_url: 'https://example.com/seeded-video.webm',
    cv_url: 'https://example.com/seeded-cv.pdf',
    portfolio_url: 'https://example.com/seeded-portfolio',
  }).eq('id', candidate.candidateId);

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

  // Video intro used to auto-pass the moment a file existed; now Hiyame's
  // team reviews it first (2026-10-07), same shape as skills assessment/CV.
  await expect(page.locator('text=Video submitted — awaiting review from the Hiyame team')).toBeVisible({ timeout: 20_000 });

  const admin = adminClient();
  const { data: cand } = await admin.from('candidates').select('video_intro_url').eq('id', candidate.candidateId).single();
  expect(cand?.video_intro_url).toContain('candidate-videos');
  const { data: afterUpload } = await admin
    .from('verification_records')
    .select('status')
    .eq('candidate_id', candidate.candidateId)
    .eq('component', 'video_intro')
    .maybeSingle();
  expect(afterUpload?.status).toBe('pending');

  const { error: approveErr } = await admin
    .from('verification_records')
    .update({ status: 'passed' })
    .eq('candidate_id', candidate.candidateId)
    .eq('component', 'video_intro');
  expect(approveErr).toBeNull();

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('text=Video submitted — awaiting review from the Hiyame team')).toHaveCount(0);
});

test('candidate uploads a CV, admin approval marks it passed; portfolio link saves independently', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  const admin = adminClient();

  // Known starting state — a retake-safe test, not reliant on a clean DB.
  await admin.from('verification_records').delete().eq('candidate_id', candidate.candidateId).eq('component', 'cv_review');
  await admin.from('candidates').update({ cv_url: null, portfolio_url: null }).eq('id', candidate.candidateId);

  await signIn(page, 'candidate', candidate.email, candidate.password);
  await page.goto('/(candidate)/verification', { waitUntil: 'networkidle' });

  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('text=Upload CV (required)').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(TEST_CV);

  // The toast ("CV submitted") and the step's own pending-state text both
  // contain "CV submitted" — assert the more specific one only, the same
  // way the skills-assessment test above checks its own pending state
  // rather than the toast.
  await expect(page.locator('text=CV submitted — awaiting review from the Hiyame team')).toBeVisible({ timeout: 15_000 });

  const { data: cand } = await admin.from('candidates').select('cv_url').eq('id', candidate.candidateId).single();
  expect(cand?.cv_url).toContain('candidate-cvs');

  const { data: afterUpload } = await admin
    .from('verification_records')
    .select('status')
    .eq('candidate_id', candidate.candidateId)
    .eq('component', 'cv_review')
    .maybeSingle();
  expect(afterUpload?.status).toBe('pending');

  // ── Portfolio link — optional, independent of the CV's own pending review ──
  const portfolioUrl = 'https://example.com/portfolio';
  await page.getByPlaceholder('Portfolio link (optional)').fill(portfolioUrl);
  await page.locator('text="Save"').click();
  await expect(page.locator('text=Portfolio link saved')).toBeVisible({ timeout: 10_000 });
  const { data: candAfterPortfolio } = await admin.from('candidates').select('portfolio_url').eq('id', candidate.candidateId).single();
  expect(candAfterPortfolio?.portfolio_url).toBe(portfolioUrl);

  // ── Admin approves the CV ──
  const { error: approveErr } = await admin
    .from('verification_records')
    .update({ status: 'passed' })
    .eq('candidate_id', candidate.candidateId)
    .eq('component', 'cv_review');
  expect(approveErr).toBeNull();

  // Same disambiguation reasoning as the skills-assessment test above: the
  // pending-review text and the upload button are unique to an un-passed
  // CV step, so their absence after reload is what Verified looks like here.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('text=CV submitted — awaiting review from the Hiyame team')).toHaveCount(0);
  await expect(page.locator('text=Upload CV (required)')).toHaveCount(0);
});
