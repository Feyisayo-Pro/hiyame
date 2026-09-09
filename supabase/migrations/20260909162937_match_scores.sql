-- Persisted output of lib/matchingEngine.ts's scoreCandidate(), computed by
-- scripts/run-matching.ts (service-role only — no client ever computes scores
-- itself, since that would require exposing the full candidate table to a
-- company's browser session).

create table match_scores (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  excluded boolean not null default false,
  exclusion_reason text,
  is_alternate boolean not null default false,
  score_breakdown jsonb not null,
  created_at timestamptz not null default now(),
  unique (role_id, candidate_id)
);

create index match_scores_role_id_idx on match_scores (role_id);
create index match_scores_candidate_id_idx on match_scores (candidate_id);

alter table match_scores enable row level security;
alter table match_scores force row level security;

-- Company side: only their own roles' matches.
create policy match_scores_select_own_company on match_scores
  for select
  using (
    role_id in (
      select r.id from roles r
      join company_users cu on cu.company_id = r.company_id
      where cu.auth_user_id = auth.uid()
    )
  );

-- Candidate side: only their own match rows (future "why this score" transparency).
create policy match_scores_select_own_candidate on match_scores
  for select
  using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

-- No INSERT/UPDATE/DELETE policy for authenticated/anon — only the service-role
-- matching script writes here, same as every other write-path in this schema.
