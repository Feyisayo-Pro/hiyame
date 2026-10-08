-- Usage log for the new AI-assist features (api/ai-assist.ts): JD drafting
-- and role-boost suggestions. Exists purely so the endpoint can rate-limit
-- each company to 5 AI requests per rolling 24h without a separate counter/
-- reset job — a plain count(*) on created_at does that for free. Also
-- doubles as a cost/usage audit trail.

create table ai_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type text not null check (type in ('draft_jd', 'boost_role')),
  created_at timestamptz not null default now()
);

create index ai_requests_company_created_idx on ai_requests (company_id, created_at);

alter table ai_requests enable row level security;
alter table ai_requests force row level security;
-- No policies: written and read exclusively by api/ai-assist.ts via the
-- service-role client, same deny-all-by-default posture every other
-- service-role-only table in this schema already uses.
