-- Shortlist + introduction flow (architecture doc §6, §7.4). Response-window
-- reminders are deferred to the Notifications milestone (Resend/push not set
-- up yet) — reminder_sent_at exists as a column now so nothing needs
-- re-shaping later, but nothing writes to it yet. Expiry is computed lazily
-- by the app (sent_at + response_window_hours vs now()), not by a scheduled job.

create table introductions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'expired')),
  response_window_hours smallint not null,
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  reminder_sent_at timestamptz,
  unique (role_id, candidate_id)
);

create index introductions_role_id_idx on introductions (role_id);
create index introductions_candidate_id_idx on introductions (candidate_id);

alter table introductions enable row level security;
alter table introductions force row level security;

-- Company side: their own roles' introductions only.
create policy introductions_select_own_company on introductions
  for select
  using (
    role_id in (
      select r.id from roles r
      join company_users cu on cu.company_id = r.company_id
      where cu.auth_user_id = auth.uid()
    )
  );

create policy introductions_insert_own_company on introductions
  for insert
  with check (
    role_id in (
      select r.id from roles r
      join company_users cu on cu.company_id = r.company_id
      where cu.auth_user_id = auth.uid()
    )
  );

-- Candidate side: their own introductions only. Column-restricted so a
-- candidate can Accept/Decline but never rewrite response_window_hours or
-- impersonate a company action.
create policy introductions_select_own_candidate on introductions
  for select
  using (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

create policy introductions_update_own_candidate on introductions
  for update
  using (candidate_id in (select id from candidates where auth_user_id = auth.uid()))
  with check (candidate_id in (select id from candidates where auth_user_id = auth.uid()));

revoke update on introductions from authenticated;
grant update (status, responded_at) on introductions to authenticated;

-- ── match_scores: company Skip/Save actions ──
alter table match_scores add column company_action text check (company_action in ('skipped', 'saved'));
alter table match_scores add column company_action_at timestamptz;

-- Companies can now update their own roles' match_scores rows (Skip/Save) —
-- previously service-role-only (the matching script writes scores; the
-- company only ever flips these two new columns).
create policy match_scores_update_own_company on match_scores
  for update
  using (
    role_id in (
      select r.id from roles r
      join company_users cu on cu.company_id = r.company_id
      where cu.auth_user_id = auth.uid()
    )
  )
  with check (
    role_id in (
      select r.id from roles r
      join company_users cu on cu.company_id = r.company_id
      where cu.auth_user_id = auth.uid()
    )
  );

revoke update on match_scores from authenticated;
grant update (company_action, company_action_at) on match_scores to authenticated;

-- ── roles/companies: candidate visibility through an ACCEPTED introduction ──
-- This is the exact gap the original schema migration's comment flagged:
-- "no candidate-side SELECT policy yet — intentionally the trigger condition
-- for the future introductions table."
create policy roles_select_via_accepted_introduction on roles
  for select
  using (
    id in (
      select i.role_id from introductions i
      join candidates c on c.id = i.candidate_id
      where c.auth_user_id = auth.uid() and i.status = 'accepted'
    )
  );

create policy companies_select_via_accepted_introduction on companies
  for select
  using (
    id in (
      select r.company_id from roles r
      join introductions i on i.role_id = r.id
      join candidates c on c.id = i.candidate_id
      where c.auth_user_id = auth.uid() and i.status = 'accepted'
    )
  );

-- ── Pre-acceptance preview: company name/logo stay hidden, only function and
-- size-band are shown (architecture doc §7.4). Security-definer RPC rather than
-- a view, since it needs to check the caller owns the introduction before
-- returning anything, and only ever exposes a fixed, narrow column set —
-- never the full companies row.
create function get_introduction_preview(p_introduction_id uuid)
returns table (
  introduction_id uuid,
  status text,
  sent_at timestamptz,
  response_window_hours smallint,
  role_title text,
  role_function text,
  role_tier text,
  company_industry text,
  company_size_range text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  return query
    select i.id, i.status, i.sent_at, i.response_window_hours,
           r.title, r.function, r.tier,
           co.industry, co.size_range
    from introductions i
    join roles r on r.id = i.role_id
    join companies co on co.id = r.company_id
    join candidates c on c.id = i.candidate_id
    where i.id = p_introduction_id
      and c.auth_user_id = auth.uid();
end;
$$;

revoke execute on function get_introduction_preview(uuid) from public;
grant execute on function get_introduction_preview(uuid) to authenticated;
