-- BUG FIX: candidates had no RLS policy letting a company see a candidate's
-- own data through their own roles' match_scores/shortlist — a company's
-- shortlist screen could see the score but every candidate field came back
-- null (RLS on the embedded `candidates` resource silently filtered it out,
-- no error). Verified live: the join returns full data via the service-role
-- key but nothing via an authenticated company session.
--
-- Per the corrected privacy rule (only company IDENTITY is hidden from
-- candidates pre-acceptance — a company sees full candidate details in its
-- own shortlist, that's the point of shortlisting), this policy is the
-- correct fix, not a workaround.

create function is_own_company_candidate(p_candidate_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from match_scores ms
    join roles r on r.id = ms.role_id
    join company_users cu on cu.company_id = r.company_id
    where ms.candidate_id = p_candidate_id
      and cu.auth_user_id = auth.uid()
      and ms.excluded = false
  );
$$;
revoke execute on function is_own_company_candidate(uuid) from public;
grant execute on function is_own_company_candidate(uuid) to authenticated;

create policy candidates_select_via_company_shortlist on candidates
  for select using (is_own_company_candidate(id));
