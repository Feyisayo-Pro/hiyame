-- Server-side plan gating (architecture doc §7.5): "every gated action...
-- must be enforced server-side, since a mobile client can be inspected or
-- modified." Team seat caps (lib/subscriptionStore.ts's TIER_CONFIGS.
-- teamSeatCap) were previously enforced only in app/(company)/team.tsx's
-- client-side invite handler — a modified/hand-crafted request could bypass
-- it entirely. This adds the same limits as a trigger, so the database
-- itself refuses an over-cap insert no matter what calls it.
--
-- Cap values must be kept in sync with TIER_CONFIGS.teamSeatCap by hand —
-- there's no shared source of truth between SQL and the TS config today.
-- pilot: 1, starter: 1, growth: 3, enterprise: unlimited.

create or replace function enforce_team_seat_cap() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_tier text;
  v_cap int;
  v_count int;
begin
  select plan_tier into v_plan_tier from companies where id = new.company_id;

  v_cap := case v_plan_tier
    when 'pilot' then 1
    when 'starter' then 1
    when 'growth' then 3
    when 'enterprise' then -1
    else 1
  end;

  if v_cap = -1 then
    return new;
  end if;

  select count(*) into v_count from company_users where company_id = new.company_id;
  if v_count >= v_cap then
    raise exception 'Team seat limit reached for the % plan (% seat%). Upgrade to add more.',
      coalesce(v_plan_tier, 'current'), v_cap, case when v_cap = 1 then '' else 's' end;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_team_seat_cap_trigger on company_users;
create trigger enforce_team_seat_cap_trigger
  before insert on company_users
  for each row execute function enforce_team_seat_cap();
