-- Lets a company see a shortlisted candidate's real work history, education
-- and certifications pre-accept (previously accepted-introduction-only),
-- while keeping two specifically identifying fields hidden until accept:
-- candidate_experience.company_name (naming a past/current employer could
-- out an actively-employed candidate before they've chosen to connect) and
-- candidate_certifications.credential_url (often a public, real-name-linked
-- verification page).
--
-- Education gets a normal RLS grant (nothing in it reads as sensitive the
-- same way). Experience and certifications deliberately do NOT get a direct
-- table policy — only a SECURITY DEFINER RPC that omits the sensitive
-- column, same shape as get_introduction_preview(). A direct policy would
-- make the masking theater, since the company's own client could just
-- select the column itself.
--
-- is_own_company_candidate/is_own_company_applicant are the existing
-- helpers that already answer "can this company see this candidate
-- pre-accept" for the matched-shortlist and direct-apply paths — reused
-- as-is rather than duplicating that logic (and risking the same
-- cross-table RLS recursion bug fixed earlier this session).

create policy candidate_education_select_via_company_shortlist on candidate_education
  for select using (is_own_company_candidate(candidate_id));
create policy candidate_education_select_via_company_applicant on candidate_education
  for select using (is_own_company_applicant(candidate_id));

create function get_candidate_experience_preview(p_candidate_id uuid)
returns table (
  id uuid,
  job_title text,
  start_date date,
  end_date date,
  is_current boolean,
  description text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (is_own_company_candidate(p_candidate_id) or is_own_company_applicant(p_candidate_id)) then
    return;
  end if;

  return query
    select e.id, e.job_title, e.start_date, e.end_date, e.is_current, e.description
    from candidate_experience e
    where e.candidate_id = p_candidate_id
    order by e.start_date desc nulls last;
end;
$$;

revoke execute on function get_candidate_experience_preview(uuid) from public;
grant execute on function get_candidate_experience_preview(uuid) to authenticated;

create function get_candidate_certifications_preview(p_candidate_id uuid)
returns table (
  id uuid,
  name text,
  issuing_organization text,
  issue_date date,
  expiry_date date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (is_own_company_candidate(p_candidate_id) or is_own_company_applicant(p_candidate_id)) then
    return;
  end if;

  return query
    select c.id, c.name, c.issuing_organization, c.issue_date, c.expiry_date
    from candidate_certifications c
    where c.candidate_id = p_candidate_id
    order by c.issue_date desc nulls last;
end;
$$;

revoke execute on function get_candidate_certifications_preview(uuid) from public;
grant execute on function get_candidate_certifications_preview(uuid) to authenticated;
