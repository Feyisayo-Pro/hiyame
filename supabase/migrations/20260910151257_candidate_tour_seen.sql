-- First-run welcome walkthrough for new candidates
-- (app/(candidate)/welcome-tour.tsx). NULL = hasn't seen it yet; the home
-- screen redirects to the tour once, and the tour stamps this on finish/skip.
-- Also re-openable from Profile.

alter table candidates add column tour_seen_at timestamptz;

-- candidates' UPDATE grant to `authenticated` is column-scoped
-- (see 20260909132855_init_schema.sql) — the candidate needs to write this one.
grant update (tour_seen_at) on candidates to authenticated;
