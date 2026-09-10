-- Team roster becomes real: app/(company)/team.tsx reads and writes
-- company_users instead of a client-side mock store. Gaps this closes:
--   * company_users had only company_users_select_own (your own row) — no way
--     to list teammates — and no INSERT/DELETE policy for companies at all.
--   * a pending invite has no auth user yet, so it needs a status flag
--     (auth_user_id is already nullable — no change needed there).
--
-- Explicitly NOT in this pass: no invite email, no verification, no login
-- path for the invitee. An invite is just a persisted 'pending' company_users
-- row — a record of intent that a future email-based claim flow will pick up
-- and activate (setting auth_user_id + status = 'active' at that point).
--
-- Self-reference note: every check below routes through is_company_member(),
-- a SECURITY DEFINER helper, not a plain subquery. A subquery on
-- company_users from inside company_users' own policy is self-referential —
-- Postgres raises 42P17 (infinite recursion) — and going through a SECURITY
-- DEFINER function also avoids the INSERT...RETURNING self-reference trap that
-- silently broke roles inserts (see fix_roles_self_reference_returning.sql):
-- the helper's lookup keys on the *inviter's* own row, which already exists
-- and is visible, so the RETURNING row for a freshly-inserted pending invite
-- still passes the SELECT check.

alter table company_users
  add column status text not null default 'active'
  check (status in ('active', 'pending'));

-- One invite per email per company. email is also the natural key the future
-- claim flow will match an accepted invite against. No existing rows, so no
-- backfill conflict.
alter table company_users
  add constraint company_users_company_email_uniq unique (company_id, email);

create function is_company_member(p_company_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from company_users
    where company_id = p_company_id and auth_user_id = auth.uid()
  );
$$;
revoke execute on function is_company_member(uuid) from public;
grant execute on function is_company_member(uuid) to authenticated;

-- Replace the self-row-only SELECT with a company-wide one. A member still
-- sees their own row (they belong to their own company), so useAuth's
-- resolveRole() lookup is unaffected — it just also sees teammates now.
drop policy company_users_select_own on company_users;
create policy company_users_select_company on company_users
  for select
  using (is_company_member(company_id));

-- Any existing member can invite or remove teammates. No owner/admin split in
-- this pass — that matches the mock's behaviour; role-gating is future work.
create policy company_users_insert_company on company_users
  for insert
  with check (is_company_member(company_id));

create policy company_users_delete_company on company_users
  for delete
  using (is_company_member(company_id));

grant insert, delete on company_users to authenticated;
