-- BUG FIX: roles_select_own_company / roles_update_own_company were rewritten
-- in fix_rls_recursion.sql to use is_own_company_role(id) "for consistency"
-- with the other cross-table cycle fixes. That was never actually needed to
-- break the introductions<->roles cycle (that cycle only ran through
-- has_accepted_introduction_for_role/_company and match_scores/introductions'
-- own policies, all of which reference OTHER tables, not roles itself) — and
-- it introduced a new, separate bug: is_own_company_role(id) re-queries
-- `roles` from inside a SECURITY DEFINER function. That's fine for plain
-- reads, but for `INSERT INTO roles ... RETURNING *` (what every
-- `.insert().select()` call in the app does), Postgres re-checks the SELECT
-- policy against the row it just inserted in the SAME statement — and that
-- self-referencing lookup fails to see the new row, so the RETURNING clause
-- gets rejected with "new row violates row-level security policy for table
-- roles" (42501) even though the INSERT itself was perfectly authorized.
--
-- Verified live: `insert ... returning` as a real company user failed 403;
-- the exact same insert with `Prefer: return=minimal` (no RETURNING) succeeded
-- 201. Confirms the SELECT-policy self-reference, not the INSERT check, was
-- at fault. This is what broke the role-creation form's `.insert().select()`
-- call silently on web (compounded by react-native-web's Alert.alert being a
-- no-op — see the companion app-side fix).
--
-- Fix: revert these two policies to the plain, non-recursive form that was
-- already correct in init_schema.sql before the "for consistency" rewrite —
-- it only queries company_users, never roles itself, so there's no
-- self-reference and no RETURNING-clause hazard. is_own_company_role() is
-- left in place and still used correctly by match_scores/introductions
-- policies (where it looks up the *other*, already-committed table).

drop policy roles_select_own_company on roles;
create policy roles_select_own_company on roles
  for select
  using (company_id in (select company_id from company_users where auth_user_id = auth.uid()));

drop policy roles_update_own_company on roles;
create policy roles_update_own_company on roles
  for update
  using (company_id in (select company_id from company_users where auth_user_id = auth.uid()))
  with check (company_id in (select company_id from company_users where auth_user_id = auth.uid()));
