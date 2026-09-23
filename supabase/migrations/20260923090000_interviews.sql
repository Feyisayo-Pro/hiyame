-- Interview scheduling — a company picks a candidate they already have a
-- real relationship with (an introduction of any status), sets a date/time
-- and a meeting link (a plain URL, or the same field labeled "Google Meet" —
-- no real Calendar API integration, matching how lightly-scoped ATS tools
-- actually do this: the company pastes/generates the Meet link themselves).
create table interviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  role_id uuid references roles(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  meeting_type text not null default 'link' check (meeting_type in ('link', 'google_meet')),
  meeting_url text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  notes text,
  created_by uuid references company_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interviews_company_id_idx on interviews (company_id);
create index interviews_candidate_id_idx on interviews (candidate_id);

alter table interviews enable row level security;
alter table interviews force row level security;

-- Company can fully manage its own interviews (schedule, reschedule, cancel,
-- mark completed/no-show) — same "own company row" ownership check every
-- other company-write policy in this schema already uses.
create policy interviews_select_own_company on interviews
  for select
  using (company_id in (select company_id from company_users where auth_user_id = auth.uid()));

create policy interviews_insert_own_company on interviews
  for insert
  with check (company_id in (select company_id from company_users where auth_user_id = auth.uid()));

create policy interviews_update_own_company on interviews
  for update
  using (company_id in (select company_id from company_users where auth_user_id = auth.uid()));

-- Candidate can see their own interviews, read-only — scheduling is a
-- company action, matching how introductions/shortlisting already work
-- (the company drives the process, the candidate responds).
create policy interviews_select_own_candidate on interviews
  for select
  using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

grant select, insert, update on interviews to authenticated;
