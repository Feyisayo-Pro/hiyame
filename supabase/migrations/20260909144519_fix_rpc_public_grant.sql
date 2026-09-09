-- SECURITY FIX: Postgres grants EXECUTE on new functions to PUBLIC by default —
-- the previous migration's `grant execute ... to authenticated` never revoked
-- that default, so the anon role (a member of PUBLIC) could still call all three
-- RPCs unauthenticated. Verified against the live project: an unauthenticated
-- call to create_company_and_claim succeeded and created a real, bogus company
-- row (id 2f9e3cdb-eefc-458f-92cf-98e25fc28b7d — deleted by hand after this fix).
--
-- Revoke the PUBLIC default explicitly, and add an internal auth.uid() guard as
-- defense-in-depth so a future grant mistake alone can't reopen this — the
-- function body itself refuses to run for an unauthenticated caller.

revoke execute on function create_company_and_claim(jsonb) from public;
revoke execute on function claim_candidate_profile() from public;
revoke execute on function claim_company_profile(uuid) from public;

create or replace function create_company_and_claim(company_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

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

create or replace function claim_candidate_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update candidates
  set auth_user_id = auth.uid()
  where lower(email) = lower(auth.email())
    and auth_user_id is null
  returning id into claimed_id;

  return claimed_id;
end;
$$;

grant execute on function claim_candidate_profile() to authenticated;

create or replace function claim_company_profile(target_company_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  intended text;
  new_row_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

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
