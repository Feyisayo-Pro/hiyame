-- Prerequisites for a real verification-records write pipeline (video intro +
-- skills assessment; employer review's own table is the next migration).
--
-- Until now nothing in the app ever wrote to verification_records — it was
-- only ever populated by the Strivo migration or manual scripts, which is
-- why every new candidate saw all 4 checklist steps stuck on "Pending"
-- forever. See api/complete-video-intro.ts, api/submit-skills-assessment.ts,
-- api/submit-employer-review-token.ts for the actual writers.

-- Mirrors candidates.photo_url exactly (same nullable-text, same
-- "set once uploaded, read everywhere" shape) — the public URL of a
-- candidate's uploaded 60s introduction clip in the candidate-videos bucket.
alter table candidates add column video_intro_url text;

-- One status per (candidate, component) is the actual domain rule here — a
-- retake should update the existing row, not accumulate a second one. No
-- constraint enforced this before because nothing ever wrote a second row;
-- confirmed zero existing duplicates before adding it. Lets every new
-- writer use a real .upsert(..., { onConflict: 'candidate_id,component' })
-- instead of three separate hand-rolled select-then-branch call sites.
alter table verification_records
  add constraint verification_records_candidate_component_key
  unique (candidate_id, component);
