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

-- Real names for company_users, not a raw email address. company_users.full_name
-- already exists (added by 20260910122824_introduction_contact_reveal.sql) but
-- was never grantable for UPDATE, and get_introduction_contact() fell back to
-- the email's local-part when it was empty — so both Team Members and an
-- accepted introduction's "Hiring Contact" card showed things like
-- "feyilive+newco1789052090" instead of a name or a generic label.
grant update (full_name) on company_users to authenticated;

-- Company logo upload (mirrors candidates.photo_url / candidate-photos bucket
-- — see api/upload-company-logo.ts and lib/uploadCompanyLogo.ts). No new
-- grant needed: companies has no column-restricted grant, so the existing
-- companies_update_own RLS policy already covers it, same as plan_tier.
alter table companies add column if not exists logo_url text;

create or replace function get_introduction_contact(p_introduction_id uuid)
returns table (
  introduction_id uuid,
  company_id uuid,
  company_name text,
  company_website text,
  company_industry text,
  company_size_range text,
  company_logo_url text,
  hiring_contact_name text,
  hiring_contact_email text,
  candidate_name text,
  candidate_email text,
  candidate_phone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_company_id uuid;
  v_candidate_id uuid;
  v_status text;
  v_is_candidate boolean;
  v_is_company boolean;
begin
  select i.role_id, i.candidate_id, i.status, r.company_id
    into v_role_id, v_candidate_id, v_status, v_company_id
  from introductions i
  join roles r on r.id = i.role_id
  where i.id = p_introduction_id;

  if v_role_id is null or v_status <> 'accepted' then
    return;
  end if;

  v_is_candidate := exists (
    select 1 from candidates c
    where c.id = v_candidate_id and c.auth_user_id = auth.uid()
  );
  v_is_company := exists (
    select 1 from company_users cu
    where cu.company_id = v_company_id and cu.auth_user_id = auth.uid()
  );

  if not (v_is_candidate or v_is_company) then
    return;
  end if;

  return query
  select
    p_introduction_id,
    co.id,
    coalesce(co.trading_name, co.legal_name),
    co.website_url,
    co.industry,
    co.size_range,
    co.logo_url,
    hc.name,
    hc.email,
    ca.full_name,
    ca.email::text,
    ca.phone
  from companies co
  left join lateral (
    -- No more email-prefix fallback here — a null name lets the client show
    -- a clean generic label ("Hiring Manager") instead of a raw address.
    select cu.full_name as name, cu.email
    from company_users cu
    where cu.company_id = co.id and cu.status = 'active'
    order by cu.created_at
    limit 1
  ) hc on true
  join candidates ca on ca.id = v_candidate_id
  where co.id = v_company_id;
end;
$$;

revoke execute on function get_introduction_contact(uuid) from public;
grant execute on function get_introduction_contact(uuid) to authenticated;
