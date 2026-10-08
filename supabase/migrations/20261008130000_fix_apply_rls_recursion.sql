-- Fixes 42P17 "infinite recursion detected" surfaced by live verification of
-- the candidate-apply migration (20261008090000_candidate_apply.sql).
--
-- roles_select_live_for_candidates (on roles) subqueried companies, and
-- companies_select_live_roles_for_candidates (on companies) subqueried roles
-- right back. A raw subquery inside a policy re-triggers the target table's
-- own RLS, so this pair forms a two-step cycle: selecting roles evaluates
-- companies' policy, which evaluates roles' policy, forever. Same root cause
-- 20260910075906_team_roster_company_users.sql already hit and fixed for
-- company_users with is_company_member() — the fix is identical: move each
-- cross-table check into its own SECURITY DEFINER function. Those functions
-- run as their (postgres) owner, which has BYPASSRLS, so the query inside
-- them never re-enters RLS and the cycle is broken.
--
-- introductions_insert_own_candidate had the same roles+companies subquery
-- inline and hit the identical error on INSERT, so it gets the same fix.

create function is_approved_company(p_company_id uuid) returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (select 1 from companies where id = p_company_id and status = 'approved');
$$;
revoke execute on function is_approved_company(uuid) from public;
grant execute on function is_approved_company(uuid) to authenticated;

create function has_live_role(p_company_id uuid) returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from roles
    where company_id = p_company_id
      and status in ('matching', 'shortlisted', 'introductions_pending')
  );
$$;
revoke execute on function has_live_role(uuid) from public;
grant execute on function has_live_role(uuid) to authenticated;

create function is_live_role(p_role_id uuid) returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from roles r
    join companies co on co.id = r.company_id
    where r.id = p_role_id
      and r.status in ('matching', 'shortlisted', 'introductions_pending')
      and co.status = 'approved'
  );
$$;
revoke execute on function is_live_role(uuid) from public;
grant execute on function is_live_role(uuid) to authenticated;

drop policy roles_select_live_for_candidates on roles;
create policy roles_select_live_for_candidates on roles
  for select
  using (
    status in ('matching', 'shortlisted', 'introductions_pending')
    and is_approved_company(company_id)
  );

drop policy companies_select_live_roles_for_candidates on companies;
create policy companies_select_live_roles_for_candidates on companies
  for select
  using (status = 'approved' and has_live_role(id));

drop policy introductions_insert_own_candidate on introductions;
create policy introductions_insert_own_candidate on introductions
  for insert
  with check (
    initiated_by = 'candidate'
    and candidate_id in (select id from candidates where auth_user_id = auth.uid() and status = 'approved')
    and is_live_role(role_id)
  );
