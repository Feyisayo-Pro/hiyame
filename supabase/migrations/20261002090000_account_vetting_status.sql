-- Lightweight account vetting gate (2026-10-02) — a placeholder ahead of the
-- real company CRM integration that will eventually own this. New signups
-- start 'pending'; an admin (see api/admin-review.ts) flips them to
-- 'approved'. ALL existing rows are explicitly backfilled to 'approved' —
-- this must never silently lock out the 16 real companies / 1117 real
-- candidates already live on the platform.

alter table companies add column status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected'));
alter table candidates add column status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected'));

update companies set status = 'approved';
update candidates set status = 'approved';

-- New companies created via signup start pending, not whatever the table
-- default happens to be — explicit beats implicit for a security-relevant
-- default. create_company_and_claim is SECURITY DEFINER, so this can't be
-- overridden by the calling client the way a plain client-side insert could.
create or replace function create_company_and_claim(company_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  insert into companies (legal_name, trading_name, industry, size_range, hq_location, website_url, description, status)
  values (
    company_data ->> 'legal_name',
    coalesce(company_data ->> 'trading_name', company_data ->> 'legal_name'),
    company_data ->> 'industry',
    company_data ->> 'size_range',
    company_data ->> 'hq_location',
    company_data ->> 'website_url',
    left(coalesce(company_data ->> 'description', ''), 300),
    'pending'
  )
  returning id into new_company_id;

  insert into company_users (company_id, auth_user_id, email, role)
  values (new_company_id, auth.uid(), auth.email(), 'hiring_manager');

  return new_company_id;
end;
$$;

-- Candidates self-insert directly from the client (lib/useAuth.ts's
-- completePendingSignup) rather than through a SECURITY DEFINER function, so
-- there's no equivalent hard guarantee here — the column default ('pending')
-- covers the normal signup path, which never sets `status` itself.

-- Companies can read their own status (candidate_select_own/company_select_own-
-- style policies already cover SELECT of the whole row); self-service UPDATE
-- is deliberately NOT granted on this column for either table — only the
-- admin endpoint (service role) can move pending -> approved.
