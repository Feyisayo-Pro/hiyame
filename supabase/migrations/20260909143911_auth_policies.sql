-- Real auth: INSERT policy for candidate self-signup, plus security-definer RPCs
-- for company self-signup and the (not-yet-triggered) migrated-user claim flow.
--
-- candidates gets a plain INSERT policy — safe, because a candidate row grants no
-- access to anything beyond itself (unlike companies, see below).
create policy candidates_insert_own on candidates
  for insert
  with check (auth_user_id = auth.uid() and verified_badge_status = 'unverified');

-- companies/company_users do NOT get a plain INSERT policy: letting any
-- authenticated user insert a company_users row naming an arbitrary existing
-- company_id would let them attach themselves to a real company they don't own
-- (UUIDs are unguessable, but this is a real authorization hole, not just
-- theoretical). Instead, one security-definer RPC creates a brand-new company and
-- the caller's own first membership row atomically — it can never attach to an
-- existing company_id, since it always inserts a fresh one.
create function create_company_and_claim(company_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  insert into companies (legal_name, trading_name, industry, size_range, hq_location, website_url, description)
  values (
    company_data ->> 'legal_name',
    coalesce(company_data ->> 'trading_name', company_data ->> 'legal_name'),
    company_data ->> 'industry',
    company_data ->> 'size_range',
    company_data ->> 'hq_location',
    company_data ->> 'website_url',
    left(coalesce(company_data ->> 'description', ''), 300)
  )
  returning id into new_company_id;

  insert into company_users (company_id, auth_user_id, email, role)
  values (new_company_id, auth.uid(), auth.email(), 'hiring_manager');

  return new_company_id;
end;
$$;

grant execute on function create_company_and_claim(jsonb) to authenticated;

-- Claim flow (built now, not triggered against real migrated data this pass —
-- see scripts/invite-strivo-users.ts). Both RPCs only ever touch the row
-- belonging to the CALLER's own verified identity (email or invite metadata),
-- never an arbitrary target, so they can't be used to hijack someone else's row.

create function claim_candidate_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
begin
  update candidates
  set auth_user_id = auth.uid()
  where lower(email) = lower(auth.email())
    and auth_user_id is null
  returning id into claimed_id;

  return claimed_id;
end;
$$;

grant execute on function claim_candidate_profile() to authenticated;

create function claim_company_profile(target_company_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  intended text;
  new_row_id uuid;
begin
  -- Only allow claiming the company this user was specifically invited to —
  -- set as `intended_company_id` in the invite's user_metadata at send time.
  intended := auth.jwt() -> 'user_metadata' ->> 'intended_company_id';
  if intended is null or intended::uuid <> target_company_id then
    raise exception 'not invited to this company';
  end if;

  insert into company_users (company_id, auth_user_id, email, role)
  values (target_company_id, auth.uid(), auth.email(), 'hiring_manager')
  returning id into new_row_id;

  return new_row_id;
end;
$$;

grant execute on function claim_company_profile(uuid) to authenticated;
