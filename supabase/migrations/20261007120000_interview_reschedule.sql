-- Interview rescheduling, capped at 2 per side (2026-10-07) — company and
-- candidate each get their own independent counter, so one side can't use
-- up the other's reschedules. Company already has a blanket
-- `grant update ... to authenticated` + RLS row-ownership policy covering
-- every column of its own interviews (see 20260923090000_interviews.sql) —
-- rescheduling from that side is just a normal client update incrementing
-- company_reschedule_count, no new grant needed.
--
-- Candidates have never had ANY write access to interviews (read-only
-- until now, by design — see that same migration's comment). Giving them
-- one specifically scoped through a SECURITY DEFINER RPC rather than a new
-- broad RLS UPDATE policy: this table's existing `grant update ... to
-- authenticated` is table-wide, not column-scoped, so a bare "candidates
-- can update their own rows" policy would let a candidate touch *any*
-- column of their own interview (company_id, meeting_url, status to
-- whatever they want) — the RPC enforces exactly which field changes and
-- by how much, the same reasoning create_company_and_claim already uses
-- for candidate/company self-service writes that need real constraints.

alter table interviews add column company_reschedule_count integer not null default 0;
alter table interviews add column candidate_reschedule_count integer not null default 0;

create or replace function reschedule_interview(p_interview_id uuid, p_new_scheduled_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interview interviews%rowtype;
  v_is_company boolean;
  v_is_candidate boolean;
begin
  select * into v_interview from interviews where id = p_interview_id;
  if not found then
    raise exception 'Interview not found.';
  end if;

  v_is_company := exists (
    select 1 from company_users
    where company_id = v_interview.company_id and auth_user_id = auth.uid()
  );
  v_is_candidate := exists (
    select 1 from candidates
    where id = v_interview.candidate_id and auth_user_id = auth.uid()
  );

  if not v_is_company and not v_is_candidate then
    raise exception 'Not authorized to reschedule this interview.';
  end if;

  if v_is_company then
    if v_interview.company_reschedule_count >= 2 then
      raise exception 'This interview has already been rescheduled twice by the company — the maximum allowed.';
    end if;
    update interviews set
      scheduled_at = p_new_scheduled_at,
      status = 'scheduled',
      company_reschedule_count = company_reschedule_count + 1,
      updated_at = now()
    where id = p_interview_id;
  else
    if v_interview.candidate_reschedule_count >= 2 then
      raise exception 'You have already rescheduled this interview twice — the maximum allowed.';
    end if;
    update interviews set
      scheduled_at = p_new_scheduled_at,
      status = 'scheduled',
      candidate_reschedule_count = candidate_reschedule_count + 1,
      updated_at = now()
    where id = p_interview_id;
  end if;
end;
$$;

revoke execute on function reschedule_interview(uuid, timestamptz) from public;
grant execute on function reschedule_interview(uuid, timestamptz) to authenticated;
