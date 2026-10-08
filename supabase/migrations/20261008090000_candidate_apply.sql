-- Candidates can apply to roles directly (2026-10-08) — additive to the
-- existing company-initiated matching/shortlist flow, not a replacement
-- (confirmed with the user). Reuses the `introductions` table rather than
-- a new one: an application and a company-sent introduction go through the
-- exact same downstream mechanics (interview scheduling, contact reveal,
-- the existing `unique(role_id, candidate_id)` constraint already
-- preventing duplicate applies to the same role) — only who can act on a
-- row, and what's visible before it's accepted, differs by origin.
--
-- Company-initiated rows keep the existing blind-matching reveal (company
-- identity hidden from the candidate, limited candidate detail to the
-- company, until accept — explicitly sold on the welcome/about pages).
-- That is UNCHANGED here. Candidate-initiated rows work the opposite way
-- by design: the candidate already chose this specific company by applying
-- to it, so there's nothing to hide from them, and the company sees the
-- candidate's full shortlist-card profile immediately, same as if the
-- candidate had been matched and accepted already.

alter table introductions add column initiated_by text not null default 'company'
  check (initiated_by in ('company', 'candidate'));

-- Candidates can create their own application — scoped to their own
-- candidate_id, must be explicitly marked 'candidate' (so this policy can
-- never be used to forge a company-initiated row), and the role must be a
-- real, live, approved listing. No INSERT grant needed — introductions
-- already has whatever base grant lets introductions_insert_own_company
-- work; this is purely an additional RLS policy on top of it.
create policy introductions_insert_own_candidate on introductions
  for insert
  with check (
    initiated_by = 'candidate'
    and candidate_id in (select id from candidates where auth_user_id = auth.uid() and status = 'approved')
    and role_id in (
      select r.id from roles r
      join companies co on co.id = r.company_id
      where r.status in ('matching', 'shortlisted', 'introductions_pending')
        and co.status = 'approved'
    )
  );

-- A company can decide (accept/reject) an application sent TO one of its
-- own roles — the mirror of introductions_update_own_candidate, which only
-- ever covered company-initiated rows (the candidate decides those).
-- Candidate-initiated rows are decided by the company instead. Same
-- column-level grant (status, responded_at) from the original migration
-- already covers this — only a new policy is needed.
create policy introductions_update_applied_own_company on introductions
  for update
  using (
    initiated_by = 'candidate'
    and role_id in (
      select r.id from roles r
      join company_users cu on cu.company_id = r.company_id
      where cu.auth_user_id = auth.uid()
    )
  )
  with check (
    initiated_by = 'candidate'
    and role_id in (
      select r.id from roles r
      join company_users cu on cu.company_id = r.company_id
      where cu.auth_user_id = auth.uid()
    )
  );

-- Candidates can browse live roles at approved companies — the gap
-- `roles_select_via_accepted_introduction`'s own comment already flagged
-- as intentional until a real "browse" feature existed. Real company
-- name/logo visible here, deliberately: see this file's own top comment
-- for why blind matching doesn't apply to a role the candidate is
-- choosing to look at and apply to themselves.
create policy roles_select_live_for_candidates on roles
  for select
  using (
    status in ('matching', 'shortlisted', 'introductions_pending')
    and company_id in (select id from companies where status = 'approved')
  );

create policy companies_select_live_roles_for_candidates on companies
  for select
  using (
    status = 'approved'
    and id in (
      select r.company_id from roles r
      where r.status in ('matching', 'shortlisted', 'introductions_pending')
    )
  );

-- A direct applicant has no match_scores row at all (they were never run
-- through the matching pipeline — they applied themselves), so the
-- existing candidates_select_via_company_shortlist policy (scoped to
-- is_own_company_candidate(), which only checks match_scores) would leave
-- a company unable to read an applicant's profile when reviewing them.
-- Same pattern as that function, scoped to introductions instead.
create function is_own_company_applicant(p_candidate_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from introductions i
    join roles r on r.id = i.role_id
    join company_users cu on cu.company_id = r.company_id
    where i.candidate_id = p_candidate_id
      and cu.auth_user_id = auth.uid()
  );
$$;
revoke execute on function is_own_company_applicant(uuid) from public;
grant execute on function is_own_company_applicant(uuid) to authenticated;

create policy candidates_select_via_company_introduction on candidates
  for select using (is_own_company_applicant(id));

-- Same reasoning, one level deeper: the Applicants section (app/(company)/
-- shortlist.tsx) needs the same per-component verification breakdown the
-- matched-candidate cards get — for those, it comes pre-computed in
-- match_scores.score_breakdown (lib/matchingPipeline.ts), which an
-- applicant never has a row in. This lets the company read verification_records
-- directly for its own applicants instead.
create policy verification_records_select_via_company_applicant on verification_records
  for select using (is_own_company_applicant(candidate_id));
