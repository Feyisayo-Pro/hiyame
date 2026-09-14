-- portfolio_items + employer_reviews (architecture doc §6) — both were
-- explicitly deferred by the very first migration's own comment ("nothing in
-- the current codebase reads/writes these yet"). This closes that gap.
--
-- portfolio_items: fully in-app, candidate-owned, up to 5 per candidate
-- (§5.1) — the cap is enforced in the app layer (components/... below), not
-- here, since Postgres has no clean native "max N rows per FK" constraint
-- without a trigger; RLS below only enforces ownership.
--
-- employer_reviews: the PRD is explicit that submission stays an emailed
-- link, not an in-app form, until Phase 2 (§11: "in-app review submission
-- (stays an emailed link)"). So this migration creates the table + a
-- SECURITY DEFINER write path for that external flow to land data into
-- (once a form/email integration exists to call it) — it deliberately does
-- NOT add any candidate- or company-facing UI, since building that would be
-- ahead of the PRD's own sequencing, the same reasoning the matching engine
-- already applies to Gig tier.

create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index portfolio_items_candidate_id_idx on portfolio_items (candidate_id);

alter table portfolio_items enable row level security;
alter table portfolio_items force row level security;

create policy portfolio_items_select_own on portfolio_items
  for select
  using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

create policy portfolio_items_insert_own on portfolio_items
  for insert
  with check (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

create policy portfolio_items_delete_own on portfolio_items
  for delete
  using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

-- A company that has an accepted introduction with this candidate can also
-- see their portfolio — same visibility rule already used for candidate
-- contact details post-acceptance (get_introduction_contact).
create policy portfolio_items_select_via_accepted_introduction on portfolio_items
  for select
  using (
    exists (
      select 1 from introductions i
      join roles r on r.id = i.role_id
      join company_users cu on cu.company_id = r.company_id
      where i.candidate_id = portfolio_items.candidate_id
        and i.status = 'accepted'
        and cu.auth_user_id = auth.uid()
    )
  );

grant select, insert, delete on portfolio_items to authenticated;

create table employer_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  reviewer_identity text, -- internal only — never selected by an authenticated-role policy below
  quality_rating smallint check (quality_rating between 1 and 5),
  reliability_rating smallint check (reliability_rating between 1 and 5),
  communication_rating smallint check (communication_rating between 1 and 5),
  would_rehire boolean,
  review_text text,
  submitted_via text not null default 'emailed_link' check (submitted_via in ('emailed_link')),
  created_at timestamptz not null default now()
);

create index employer_reviews_candidate_id_idx on employer_reviews (candidate_id);

alter table employer_reviews enable row level security;
alter table employer_reviews force row level security;

-- Candidates can see the ratings/text on their own reviews (useful for their
-- own profile), but never reviewer_identity — enforced by a column-level
-- grant, not by the row policy, since RLS can't hide individual columns.
create policy employer_reviews_select_own on employer_reviews
  for select
  using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

grant select (id, candidate_id, quality_rating, reliability_rating, communication_rating, would_rehire, review_text, submitted_via, created_at)
  on employer_reviews to authenticated;

-- No insert/update/delete grant to authenticated at all — the only write
-- path is the SECURITY DEFINER function below, for the future emailed-link
-- intake flow (a Vercel function verifying a signed link token would call
-- this, similar in spirit to get_introduction_contact's gatekeeper pattern).
create function submit_employer_review(
  p_candidate_id uuid,
  p_reviewer_identity text,
  p_quality_rating smallint,
  p_reliability_rating smallint,
  p_communication_rating smallint,
  p_would_rehire boolean,
  p_review_text text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into employer_reviews (
    candidate_id, reviewer_identity, quality_rating, reliability_rating,
    communication_rating, would_rehire, review_text
  ) values (
    p_candidate_id, p_reviewer_identity, p_quality_rating, p_reliability_rating,
    p_communication_rating, p_would_rehire, p_review_text
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Not granted to authenticated/anon at all — only callable with the service
-- role, i.e. from a trusted backend endpoint once the emailed-link intake
-- exists. Nothing in the client app calls this today.
revoke execute on function submit_employer_review(uuid, text, smallint, smallint, smallint, boolean, text) from public;
