-- Real persistence for the Push Notifications / Email Updates toggles in
-- Settings (components/AccountSettings.tsx) — they were session-local React
-- state with nowhere to live. One column per persona's own row, since
-- preferences are per signed-in *person*, not per company.
--
-- NOTE: this environment has no linked Supabase CLI session, so this
-- migration could not be applied automatically. Apply it once via the
-- Supabase Dashboard → SQL Editor → paste this file → Run, then the app
-- code (already written to use these columns) will start persisting for
-- real with no further deploy needed.

alter table candidates
  add column if not exists notification_prefs jsonb not null default '{"push": true, "email": true}'::jsonb;

alter table company_users
  add column if not exists notification_prefs jsonb not null default '{"push": true, "email": true}'::jsonb;

grant update (notification_prefs) on candidates to authenticated;

-- company_users had no UPDATE policy at all before this — a company user
-- could not update even their own row (verified: only select/insert/delete
-- policies exist, see 20260910075906_team_roster_company_users.sql).
create policy company_users_update_self on company_users
  for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

grant update (notification_prefs) on company_users to authenticated;
