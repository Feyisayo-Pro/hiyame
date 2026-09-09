-- Hiyame initial schema — companies, candidates, roles, verification_records,
-- plus a minimal company_users table (structural only, seeded empty this pass —
-- see supabase/migrations/README or the migration plan for why).
--
-- Scope: only what's needed to (a) migrate real Strivo data and (b) satisfy the
-- existing dormant frontend contracts (lib/matchingEngine.ts, lib/mock-data.ts's
-- Role type, lib/useVerification.ts's VerificationState). Deferred to a later
-- milestone: match_scores, introductions, hires, job_slots, plans, billing_events —
-- nothing in the current codebase reads/writes these yet.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ═══════════════════════════════════════════════════════════
-- COMPANIES
-- ═══════════════════════════════════════════════════════════
create table companies (
  id uuid primary key default gen_random_uuid(),
  external_source text,
  external_id text,
  legal_name text not null,
  trading_name text,
  industry text,
  size_range text,
  hq_location text,
  website_url text,
  description text check (char_length(description) <= 300),
  plan_tier text not null default 'pilot'
    check (plan_tier in ('pilot', 'starter', 'growth', 'enterprise')),
  verified_at timestamptz,
  billing_customer_id text,
  import_meta jsonb,
  created_at timestamptz not null default now()
);

create unique index companies_external_source_id_key
  on companies (external_source, external_id)
  where external_source is not null;

-- ═══════════════════════════════════════════════════════════
-- COMPANY_USERS — structural only this pass; stays empty until the
-- invite/team-management milestone. Required now so the RLS policies
-- on companies/roles below have something valid to reference (they are
-- effectively default-deny until rows exist here).
-- ═══════════════════════════════════════════════════════════
create table company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id),
  email text,
  role text check (role in ('hiring_manager', 'talent_lead')),
  created_at timestamptz not null default now()
);

create index company_users_company_id_idx on company_users (company_id);

-- ═══════════════════════════════════════════════════════════
-- CANDIDATES
-- ═══════════════════════════════════════════════════════════
create table candidates (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id),
  external_source text,
  external_id text,
  full_name text not null,
  email citext,
  phone text,
  photo_url text,
  function_tags text[] not null default '{}',
  skill_tags text[] not null default '{}',
  experience_level text check (experience_level in ('junior', 'mid', 'senior', 'lead')),
  location text,
  remote_preference text check (remote_preference in ('remote', 'hybrid', 'on_site', 'flexible')),
  tier_preferences text[] not null default '{}',
  rate_min numeric,
  rate_preferred numeric,
  rate_max numeric,
  availability_date date,
  reliability_score smallint check (reliability_score between 0 and 100),
  verified_badge_status text not null default 'unverified'
    check (verified_badge_status in ('unverified', 'pending', 'verified')),
  last_verified_at timestamptz,
  inactive_since timestamptz,
  import_meta jsonb,
  created_at timestamptz not null default now()
);

create unique index candidates_external_source_id_key
  on candidates (external_source, external_id)
  where external_source is not null;

create unique index candidates_email_key
  on candidates (lower(email))
  where email is not null;

-- ═══════════════════════════════════════════════════════════
-- ROLES
-- ═══════════════════════════════════════════════════════════
create table roles (
  id uuid primary key default gen_random_uuid(),
  external_source text,
  external_id text,
  company_id uuid not null references companies(id) on delete cascade,
  tier text not null check (tier in ('corporate', 'short_term', 'gig')),
  title text not null,
  function text,
  required_skills jsonb not null default '{"must_have": [], "nice_to_have": []}'::jsonb,
  experience_level text check (experience_level in ('junior', 'mid', 'senior', 'lead')),
  location_type text check (location_type in ('remote', 'hybrid', 'on_site')),
  location_city text,
  location_country text,
  contract_length text,
  rate_min numeric,
  rate_max numeric,
  rate_type text not null default 'monthly' check (rate_type in ('monthly', 'hourly', 'fixed')),
  start_date date,
  visibility_description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'matching', 'shortlisted', 'introductions_pending', 'filled', 'withdrawn')),
  import_meta jsonb,
  created_at timestamptz not null default now()
);

create unique index roles_external_source_id_key
  on roles (external_source, external_id)
  where external_source is not null;

create index roles_company_id_idx on roles (company_id);

-- ═══════════════════════════════════════════════════════════
-- VERIFICATION_RECORDS — created empty; no Strivo data maps here.
-- component values match lib/useVerification.ts's VerificationState keys
-- and lib/matchingEngine.ts's eligibility rules exactly.
-- ═══════════════════════════════════════════════════════════
create table verification_records (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  component text not null
    check (component in ('identity', 'video_intro', 'skills_assessment', 'employer_review')),
  status text not null default 'pending'
    check (status in ('pending', 'passed', 'failed', 'resubmission')),
  provider_ref text,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verification_records_candidate_id_idx on verification_records (candidate_id);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table companies enable row level security;
alter table companies force row level security;
alter table company_users enable row level security;
alter table company_users force row level security;
alter table candidates enable row level security;
alter table candidates force row level security;
alter table roles enable row level security;
alter table roles force row level security;
alter table verification_records enable row level security;
alter table verification_records force row level security;

-- companies: scoped to the caller's company via company_users.
-- Effectively default-deny until company_users has rows (known follow-up).
create policy companies_select_own on companies
  for select
  using (id in (select company_id from company_users where auth_user_id = auth.uid()));

create policy companies_update_own on companies
  for update
  using (id in (select company_id from company_users where auth_user_id = auth.uid()))
  with check (id in (select company_id from company_users where auth_user_id = auth.uid()));

-- company_users: self-row only.
create policy company_users_select_own on company_users
  for select
  using (auth_user_id = auth.uid());

-- candidates: own row only. verified_badge_status, reliability_score,
-- last_verified_at, import_meta, external_* are protected from self-service
-- edits via column-level GRANT below, not by this row policy.
create policy candidates_select_own on candidates
  for select
  using (auth_user_id = auth.uid());

create policy candidates_update_own on candidates
  for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

revoke update on candidates from authenticated;
grant update (
  full_name, phone, photo_url, function_tags, skill_tags, location,
  remote_preference, tier_preferences, rate_min, rate_preferred, rate_max,
  availability_date
) on candidates to authenticated;

-- roles: company-side access scoped via company_users. No candidate-side
-- SELECT policy yet (default-deny) — intentionally the trigger condition
-- for the future introductions table; the live app still renders mock
-- data today, so this is not a regression.
create policy roles_select_own_company on roles
  for select
  using (company_id in (select company_id from company_users where auth_user_id = auth.uid()));

create policy roles_insert_own_company on roles
  for insert
  with check (company_id in (select company_id from company_users where auth_user_id = auth.uid()));

create policy roles_update_own_company on roles
  for update
  using (company_id in (select company_id from company_users where auth_user_id = auth.uid()))
  with check (company_id in (select company_id from company_users where auth_user_id = auth.uid()));

-- verification_records: owning candidate can read; no authenticated/anon
-- writes — only a future service-role verification pipeline writes here.
create policy verification_records_select_own on verification_records
  for select
  using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
