-- Auto-run matching: a role's shortlist is now built by the matching pipeline
-- (lib/matchingPipeline.ts), invoked right after the role is posted via the
-- api/run-matching serverless function, and re-runnable from the shortlist
-- screen.
--
-- matching_ran_at lets the UI distinguish two empty states that look identical
-- otherwise: NULL = the pipeline hasn't run for this role yet (show a spinner
-- and kick it off); a timestamp with no match_scores rows = it ran and nothing
-- cleared the bar (show "no matches yet", offer re-run). The pipeline stamps
-- this at the end of every run.
--
-- Backfill: the 85 migrated roles have never been matched, so NULL is correct
-- for them — opening any of their shortlists will trigger a first run.

alter table roles add column matching_ran_at timestamptz;
