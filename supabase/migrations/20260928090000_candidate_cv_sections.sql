-- Candidate profile → CV format (Summary, Job Experience, Education,
-- Certifications), per the Demo Day plan. Same shape as portfolio_items
-- (20260914151500): candidate-owned, RLS-scoped to the owning candidate,
-- plus read access for a company with an accepted introduction — the same
-- visibility rule contact details and portfolio already use.

alter table candidates add column summary text;

create table candidate_experience (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_title text not null,
  company_name text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

create table candidate_education (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  institution text not null,
  qualification text not null,
  field_of_study text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table candidate_certifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  name text not null,
  issuing_organization text,
  issue_date date,
  expiry_date date,
  credential_url text,
  created_at timestamptz not null default now()
);

create index candidate_experience_candidate_id_idx on candidate_experience (candidate_id);
create index candidate_education_candidate_id_idx on candidate_education (candidate_id);
create index candidate_certifications_candidate_id_idx on candidate_certifications (candidate_id);

alter table candidate_experience enable row level security;
alter table candidate_experience force row level security;
alter table candidate_education enable row level security;
alter table candidate_education force row level security;
alter table candidate_certifications enable row level security;
alter table candidate_certifications force row level security;

-- candidate_experience
create policy candidate_experience_select_own on candidate_experience
  for select using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_experience_insert_own on candidate_experience
  for insert with check (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_experience_update_own on candidate_experience
  for update using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_experience_delete_own on candidate_experience
  for delete using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_experience_select_via_accepted_introduction on candidate_experience
  for select using (
    exists (
      select 1 from introductions i
      join roles r on r.id = i.role_id
      join company_users cu on cu.company_id = r.company_id
      where i.candidate_id = candidate_experience.candidate_id
        and i.status = 'accepted'
        and cu.auth_user_id = auth.uid()
    )
  );
grant select, insert, update, delete on candidate_experience to authenticated;

-- candidate_education
create policy candidate_education_select_own on candidate_education
  for select using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_education_insert_own on candidate_education
  for insert with check (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_education_update_own on candidate_education
  for update using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_education_delete_own on candidate_education
  for delete using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_education_select_via_accepted_introduction on candidate_education
  for select using (
    exists (
      select 1 from introductions i
      join roles r on r.id = i.role_id
      join company_users cu on cu.company_id = r.company_id
      where i.candidate_id = candidate_education.candidate_id
        and i.status = 'accepted'
        and cu.auth_user_id = auth.uid()
    )
  );
grant select, insert, update, delete on candidate_education to authenticated;

-- candidate_certifications
create policy candidate_certifications_select_own on candidate_certifications
  for select using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_certifications_insert_own on candidate_certifications
  for insert with check (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_certifications_update_own on candidate_certifications
  for update using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_certifications_delete_own on candidate_certifications
  for delete using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));
create policy candidate_certifications_select_via_accepted_introduction on candidate_certifications
  for select using (
    exists (
      select 1 from introductions i
      join roles r on r.id = i.role_id
      join company_users cu on cu.company_id = r.company_id
      where i.candidate_id = candidate_certifications.candidate_id
        and i.status = 'accepted'
        and cu.auth_user_id = auth.uid()
    )
  );
grant select, insert, update, delete on candidate_certifications to authenticated;
