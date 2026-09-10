-- Introduction reminders & expiry (architecture doc §7.4): a scheduled job
-- fires one reminder at the halfway point and expires an introduction whose
-- response window has lapsed.
--
-- Split by concern:
--   * Expiry is pure SQL (no email, no network) — pg_cron runs it every 10 min.
--   * The emails (halfway reminder to the candidate, expiry notice to the
--     company) need the Resend integration, so pg_cron pokes the
--     /api/cron/introductions endpoint via pg_net every 15 min. That endpoint
--     is guarded by a shared secret.
--
-- The endpoint URL and secret are read from database settings applied
-- out-of-band with `ALTER DATABASE postgres SET app.settings.cron_url = ...`
-- (and cron_secret) — never committed here. If they're unset the poke is a
-- no-op, so this migration is safe to apply before they're configured.

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table introductions add column notified_expired_at timestamptz;

-- Pure-SQL expiry. SECURITY DEFINER so pg_cron's worker can update the table
-- regardless of RLS.
create or replace function expire_stale_introductions() returns void
language sql security definer set search_path = public as $$
  update introductions
  set status = 'expired'
  where status = 'sent'
    and now() > sent_at + make_interval(hours => response_window_hours);
$$;
revoke execute on function expire_stale_introductions() from public;

select cron.schedule(
  'expire-introductions',
  '*/10 * * * *',
  $$ select expire_stale_introductions() $$
);

select cron.schedule(
  'introductions-email-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.cron_url', true),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true),
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  )
  where nullif(current_setting('app.settings.cron_url', true), '') is not null
  $$
);
