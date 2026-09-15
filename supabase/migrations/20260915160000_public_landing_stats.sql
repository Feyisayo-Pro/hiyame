-- Public, count-only stats for the logged-out About page (app/(auth)/about.tsx).
-- RLS on candidates/companies/roles correctly hides all real rows from the
-- anon role, so a direct anon SELECT count comes back as 0 for everyone —
-- not an error, just silently wrong, which would render "0 professionals in
-- the network" on a real marketing page. This SECURITY DEFINER function is
-- the standard escape hatch already used elsewhere in this schema
-- (get_introduction_contact, submit_employer_review): it runs as the
-- function owner (bypassing RLS) but only ever returns 3 integers, never a
-- row of real data, so it's safe to grant to anon.
create or replace function public.get_public_landing_stats()
returns table (candidates_count bigint, companies_count bigint, roles_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.candidates),
    (select count(*) from public.companies),
    (select count(*) from public.roles);
$$;

revoke all on function public.get_public_landing_stats() from public;
grant execute on function public.get_public_landing_stats() to anon, authenticated;
