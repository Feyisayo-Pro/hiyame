-- Introduction contact reveal (architecture doc §7.4). The doc's communication
-- model is: introduction accepted -> both sides' contact details are revealed
-- -> the two parties reach out directly (email). There is no in-app chat in
-- the doc. This closes the gap where an accepted introduction was a dead end
-- (each side could see only the other's name).
--
-- get_introduction_contact returns the unmasked details for an introduction —
-- but ONLY when its status is 'accepted' AND the caller is one of the two
-- parties (the candidate, or a member of the role's company). Any other
-- caller, or a not-yet-accepted introduction, gets zero rows. SECURITY
-- DEFINER so it can read across candidates / companies / company_users as the
-- gatekeeper; callable by authenticated only.
--
-- company_users gets a nullable full_name so the hiring contact can be shown
-- by name; until it's captured in the invite flow it falls back to the email
-- local-part.

alter table company_users add column full_name text;

create function get_introduction_contact(p_introduction_id uuid)
returns table (
  introduction_id uuid,
  company_id uuid,
  company_name text,
  company_website text,
  company_industry text,
  company_size_range text,
  hiring_contact_name text,
  hiring_contact_email text,
  candidate_name text,
  candidate_email text,
  candidate_phone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_company_id uuid;
  v_candidate_id uuid;
  v_status text;
  v_is_candidate boolean;
  v_is_company boolean;
begin
  select i.role_id, i.candidate_id, i.status, r.company_id
    into v_role_id, v_candidate_id, v_status, v_company_id
  from introductions i
  join roles r on r.id = i.role_id
  where i.id = p_introduction_id;

  if v_role_id is null or v_status <> 'accepted' then
    return;
  end if;

  v_is_candidate := exists (
    select 1 from candidates c
    where c.id = v_candidate_id and c.auth_user_id = auth.uid()
  );
  v_is_company := exists (
    select 1 from company_users cu
    where cu.company_id = v_company_id and cu.auth_user_id = auth.uid()
  );

  if not (v_is_candidate or v_is_company) then
    return;
  end if;

  return query
  select
    p_introduction_id,
    co.id,
    coalesce(co.trading_name, co.legal_name),
    co.website_url,
    co.industry,
    co.size_range,
    hc.name,
    hc.email,
    ca.full_name,
    ca.email::text,
    ca.phone
  from companies co
  left join lateral (
    select coalesce(cu.full_name, split_part(cu.email, '@', 1)) as name, cu.email
    from company_users cu
    where cu.company_id = co.id and cu.status = 'active'
    order by cu.created_at
    limit 1
  ) hc on true
  join candidates ca on ca.id = v_candidate_id
  where co.id = v_company_id;
end;
$$;

revoke execute on function get_introduction_contact(uuid) from public;
grant execute on function get_introduction_contact(uuid) to authenticated;
