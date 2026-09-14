-- Inactive-candidate re-verification flag (architecture doc §7.3): "A
-- candidate inactive 18+ months should be flagged for re-verification before
-- appearing in any new shortlist... Build this as a scheduled check, not a
-- real-time one."
--
-- Reuses the existing verification_records.status = 'resubmission' value
-- rather than adding a new column/flag — a candidate flagged this way drops
-- out of lib/matchingPipeline.ts's "passed" pool automatically (it only
-- counts status = 'passed'), which is exactly the "before appearing in any
-- new shortlist" requirement, with no changes needed on the app side.
-- Self-limiting: once a record is flipped to 'resubmission' it no longer
-- matches the `status = 'passed'` filter below, so re-running this job is
-- always safe and never re-flags the same row twice.

create or replace function flag_inactive_candidates_for_reverification() returns void
language sql security definer set search_path = public as $$
  update verification_records
  set status = 'resubmission', updated_at = now()
  where status = 'passed'
    and candidate_id in (
      select id from candidates
      where inactive_since is not null
        and inactive_since <= now() - interval '18 months'
    );
$$;
revoke execute on function flag_inactive_candidates_for_reverification() from public;

-- Daily is plenty — this is a slow-moving eligibility check, not a
-- time-sensitive one like the introduction expiry job.
select cron.schedule(
  'flag-inactive-candidates',
  '0 3 * * *',
  $$ select flag_inactive_candidates_for_reverification() $$
);
