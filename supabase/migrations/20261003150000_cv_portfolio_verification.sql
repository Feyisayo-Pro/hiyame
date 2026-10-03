-- CV/portfolio verification (2026-10-03) — replaces Employer Review's slot
-- in the candidate verification checklist. A candidate uploads a CV (PDF,
-- required) and optionally adds a portfolio link; an admin reviews the CV
-- and marks the 'cv_review' component passed/failed from /(admin)/candidates.
--
-- Employer Review itself is NOT removed — employer_reviews,
-- employer_review_requests, the submit_employer_review RPC, and
-- api/employer-review.ts all stay exactly as they are (zero risk, fully
-- reversible if ever needed again). This migration only adds a new,
-- independent component alongside it; verification.tsx stops linking to
-- the employer-review flow in app code, not here.

alter table candidates add column cv_url text;
alter table candidates add column portfolio_url text;

-- cv_url is deliberately NOT grantable to candidates directly — it's only
-- ever set by api/upload-candidate-cv.ts (service role) after confirming a
-- real file landed in Storage, same reasoning as video_intro_url/photo_url.
-- portfolio_url is just a link the candidate types in, no upload/review
-- step behind it, so a direct client update is fine — same column-grant
-- pattern as tour_seen_at/notification_prefs/summary above it.
grant update (portfolio_url) on candidates to authenticated;

-- Additive only — 'employer_review' stays a valid value for any historical
-- rows, nothing is dropped or renamed.
alter table verification_records drop constraint verification_records_component_check;
alter table verification_records add constraint verification_records_component_check
  check (component in ('identity', 'video_intro', 'skills_assessment', 'employer_review', 'cv_review'));
