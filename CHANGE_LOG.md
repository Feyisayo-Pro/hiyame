# Change Log — Demo Day push (28 Sep – 2 Oct 2026)

Running log of what shipped each day on the way to Demo Day. One entry per
day, newest on top. Not a commit-by-commit log — `git log` already has that;
this is the "what changed and why it mattered for the demo" summary.

---

## Mon 28 Sep

- Fixed a real bug in the interview-scheduling modal: a missing `!inner`
  hint let PostgREST silently drop the company-scoping filter, so the
  candidate search could return introductions belonging to *other*
  companies. Caught live-testing, fixed and committed (`356e971`).
- Candidate profile rebuilt toward CV format: added `summary` plus
  `candidate_experience`, `candidate_education`, and
  `candidate_certifications` tables (RLS matching the existing
  `portfolio_items` pattern — candidate-owned, company-visible only after
  an accepted introduction) and three new profile sections
  (Job Experience / Education / Certifications) to add/edit/remove each,
  plus a Summary field in the edit modal. Verified rendering live against
  the local dev server (Playwright) — sections degrade cleanly to their
  empty state until the migration below is applied.
  **Migration not yet applied to the live database** — see below.
- Interview scheduling now sends a real notification (email via Resend +
  in-app push) to the candidate when a company books a slot — previously
  it only toasted the company user who scheduled it. New
  `api/notify-interview.ts` endpoint mirrors the existing
  `api/notify-introduction.ts` pattern (idempotent via
  `interviews.notified_scheduled_at`).
- Resend domain verification started (external dependency — DNS + Resend
  dashboard, tracked separately, see status below).

**Blocking / needs your action before this is demo-ready:**
- Run the two new migrations against the live Supabase project:
  `npx supabase link --project-ref ccjphcktvkclimhnzxgs && npx supabase db push`
  (or paste `supabase/migrations/20260928090000_candidate_cv_sections.sql`
  and `20260928091000_interview_notifications.sql` into the Supabase SQL
  editor). Until this runs, the new profile sections show empty states
  and interview-scheduling notifications silently no-op.
- Resend domain verification (blocks real email delivery outside the one
  whitelisted test address until DNS propagates and Resend confirms it).
- Nothing here is committed yet — review the diff and say the word.

**Open / carried to Tue:**
- JD structured fields (Overview/Responsibilities/Requirements),
  Employment Type (Permanent/Contract) and Urgency on the job-posting form.
- Logo mark applied to OS-level assets (icon/favicon/splash) but not yet
  rendered inside in-app headers/loading screens.
