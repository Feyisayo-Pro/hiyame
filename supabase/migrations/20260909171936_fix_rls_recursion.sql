-- SECURITY/CORRECTNESS FIX: introductions.sql introduced roles/companies
-- policies that subquery `introductions`, while `introductions`/`match_scores`
-- policies subquery `roles` — a circular RLS dependency. Verified live: any
-- query touching `introductions` or `roles` failed with "infinite recursion
-- detected in policy for relation" (Postgres error 42P17).
--
-- Fix: replace every cross-table policy subquery with a SECURITY DEFINER
-- helper function. These functions are owned by the migration-applying
-- superuser, which bypasses RLS unconditionally (independent of FORCE ROW
-- LEVEL SECURITY, which only affects non-superuser table owners) — so the
-- lookup inside each helper never re-triggers the referenced table's own
-- policies, breaking the cycle. This is the same pattern already used
-- correctly for the auth milestone's create_company_and_claim/claim_*
-- functions; it just wasn't applied to these cross-table policy checks too.

create function is_own_company_role(p_role_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from roles r
    join company_users cu on cu.company_id = r.company_id
    where r.id = p_role_id and cu.auth_user_id = auth.uid()
  );
$$;
revoke execute on function is_own_company_role(uuid) from public;
grant execute on function is_own_company_role(uuid) to authenticated;

create function has_accepted_introduction_for_role(p_role_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from introductions i
    join candidates c on c.id = i.candidate_id
    where i.role_id = p_role_id and c.auth_user_id = auth.uid() and i.status = 'accepted'
  );
$$;
revoke execute on function has_accepted_introduction_for_role(uuid) from public;
grant execute on function has_accepted_introduction_for_role(uuid) to authenticated;

create function has_accepted_introduction_for_company(p_company_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from introductions i
    join roles r on r.id = i.role_id
    join candidates c on c.id = i.candidate_id
    where r.company_id = p_company_id and c.auth_user_id = auth.uid() and i.status = 'accepted'
  );
$$;
revoke execute on function has_accepted_introduction_for_company(uuid) from public;
grant execute on function has_accepted_introduction_for_company(uuid) to authenticated;

-- ── roles (from init_schema.sql) ──
drop policy roles_select_own_company on roles;
create policy roles_select_own_company on roles
  for select using (is_own_company_role(id));

drop policy roles_update_own_company on roles;
create policy roles_update_own_company on roles
  for update using (is_own_company_role(id)) with check (is_own_company_role(id));
-- roles_insert_own_company is left as-is — it only queries company_users
-- (the row doesn't exist yet at insert time), no cycle risk.

-- ── roles/companies via accepted introduction (from introductions.sql) ──
drop policy roles_select_via_accepted_introduction on roles;
create policy roles_select_via_accepted_introduction on roles
  for select using (has_accepted_introduction_for_role(id));

drop policy companies_select_via_accepted_introduction on companies;
create policy companies_select_via_accepted_introduction on companies
  for select using (has_accepted_introduction_for_company(id));

-- ── match_scores (select from match_scores.sql, update from introductions.sql) ──
drop policy match_scores_select_own_company on match_scores;
create policy match_scores_select_own_company on match_scores
  for select using (is_own_company_role(role_id));

drop policy match_scores_update_own_company on match_scores;
create policy match_scores_update_own_company on match_scores
  for update using (is_own_company_role(role_id)) with check (is_own_company_role(role_id));

-- ── introductions (company side, from introductions.sql) ──
drop policy introductions_select_own_company on introductions;
create policy introductions_select_own_company on introductions
  for select using (is_own_company_role(role_id));

drop policy introductions_insert_own_company on introductions;
create policy introductions_insert_own_company on introductions
  for insert with check (is_own_company_role(role_id));
