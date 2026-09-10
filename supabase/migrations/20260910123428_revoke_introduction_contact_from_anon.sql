-- Defense-in-depth: get_introduction_contact is SECURITY DEFINER and returns
-- nothing unless the caller is a party to an accepted introduction, so an
-- unauthenticated call already leaks nothing. But it should not be callable
-- as `anon` at all. Supabase's default privileges grant EXECUTE on new public
-- functions to `anon` and `authenticated` individually, so the previous
-- migration's `revoke ... from public` didn't remove the `anon` grant.
-- Remove it explicitly, and do the same for get_introduction_preview which
-- was created the same way.

revoke execute on function get_introduction_contact(uuid) from anon;
revoke execute on function get_introduction_preview(uuid) from anon;
