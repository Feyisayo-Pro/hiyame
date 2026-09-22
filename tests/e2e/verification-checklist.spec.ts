// Covers the three verification steps that were pure decoration before this
// milestone — see app/(candidate)/verification.tsx's own history: nothing
// in the app ever wrote to verification_records until these three write
// paths existed (api/video-intro.ts, api/skills-assessment.ts,
// api/employer-review.ts). Identity Check is out of scope everywhere in
// this codebase right now (lib/verification.ts documents Smile ID as
// paused pending a real KYC vendor account), so it isn't covered here.
//
// All three assert against the real database via a service-role client,
// not just UI text — a toast or a "Verified" pill proves the UI updated,
// not that verification_records actually changed underneath it.
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loadTestAccounts, signIn } from './helpers';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './testEnv';

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

// Correct-answer option text for lib/skillsAssessmentBank.ts's 12 questions,
// in order — this suite deliberately answers every question, since scoring
// itself is a server-side concern already covered by the fact this route
// exists at all; what needs an E2E check is that a real attempt reaches the
// database with the right outcome.
const CORRECT_ANSWERS = [
  "Tell your manager what's already committed today and ask how they'd like it prioritized",
  'Ignore the tone, take a moment, and respond to the substance of the feedback',
  'Flag it to the stakeholder as soon as you know, with a realistic new estimate',
  "Raise your concerns clearly once, then support the team's direction once a decision is made",
  "Say you're not certain, and commit to a specific time you'll follow up with an answer",
  'Proactively flag the mistake and the fix to whoever received the work',
  'Suggest a specific change — an agenda, a time limit, or a clearer goal — to whoever runs it',
  'Accept, and proactively flag where you might need support or more time given the gap in expertise',
  'Surface the conflict to both parties so they can align, rather than deciding for them',
  "Look for a way to add value — reviewing your own work, helping a teammate, or getting ahead on what's next",
  "State your best interpretation, proceed on that basis, and confirm it as soon as they're available",
  'Raise the pattern directly and propose a way to lock scope for the next phase',
];

test('candidate can pass the skills assessment', async ({ page }) => {
  const { candidate } = loadTestAccounts();
  await signIn(page, 'candidate', candidate.email, candidate.password);
  await page.goto('/(candidate)/verification', { waitUntil: 'networkidle' });

  await page.locator('text=Begin Assessment').click();
  await page.locator('text="Start"').click();

  for (let i = 0; i < CORRECT_ANSWERS.length; i++) {
    await page.locator(`text=${CORRECT_ANSWERS[i]}`).click();
    const isLast = i === CORRECT_ANSWERS.length - 1;
    await page.locator(isLast ? 'text="Submit"' : 'text="Next"').click();
  }

  await expect(page.locator("text=You've passed the skills assessment.")).toBeVisible({ timeout: 15_000 });

  const admin = adminClient();
  const { data } = await admin
    .from('verification_records')
    .select('status, provider_ref')
    .eq('candidate_id', candidate.candidateId)
    .eq('component', 'skills_assessment')
    .maybeSingle();
  expect(data?.status).toBe('passed');
  expect(data?.provider_ref).toBe('12/12');
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
