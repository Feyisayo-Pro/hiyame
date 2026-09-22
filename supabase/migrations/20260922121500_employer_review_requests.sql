-- Tracks a candidate's request for a reference from a past employer — the
-- "emailed link" intake flow that supabase/migrations/20260914151500's
-- submit_employer_review(...) RPC was already built for but had no caller.
--
-- The reviewer has no Hiyame account and shouldn't need one — the token in
-- this table (mailed as a link, never a Supabase-authenticated session) IS
-- the credential. api/submit-employer-review-token.ts is the only writer
-- of `status`/`review_id` (via the service role), so there is no
-- update/delete grant to `authenticated` at all: a candidate can see their
-- own requests but can't mark one submitted themselves.
create table employer_review_requests (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  employer_name text not null,
  employer_email citext not null,
  token text not null,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'expired')),
  review_id uuid references employer_reviews(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create unique index employer_review_requests_token_key on employer_review_requests (token);
create index employer_review_requests_candidate_id_idx on employer_review_requests (candidate_id);

alter table employer_review_requests enable row level security;
alter table employer_review_requests force row level security;

create policy employer_review_requests_select_own on employer_review_requests
  for select
  using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

create policy employer_review_requests_insert_own on employer_review_requests
  for insert
  with check (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

grant select, insert on employer_review_requests to authenticated;
