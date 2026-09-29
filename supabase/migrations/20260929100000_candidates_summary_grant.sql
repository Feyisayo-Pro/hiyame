-- candidates.summary (20260928090000_candidate_cv_sections.sql) was added
-- without the column-level UPDATE grant every other self-editable candidates
-- column needs (init_schema.sql revokes blanket UPDATE and grants column by
-- column — same gap tour_seen_at and notification_prefs each had to close
-- with their own grant when they were added). Without this, a candidate's
-- own profile-edit save silently fails on "permission denied for column
-- summary" — caught by the E2E suite's candidate-profile-edit spec failing
-- against production right after this branch shipped.

grant update (summary) on candidates to authenticated;
