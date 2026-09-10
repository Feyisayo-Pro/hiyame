-- The previous migration read the cron endpoint URL + secret from
-- `current_setting('app.settings.*')`, but Supabase's postgres role can't
-- `ALTER DATABASE ... SET` custom params ("permission denied to set
-- parameter"). Use a table in a non-public schema instead — `private` isn't
-- exposed through PostgREST and anon/authenticated get no grants, so it's
-- effectively service-role/owner only.
--
-- The URL is not sensitive and is seeded here. The secret is inserted
-- out-of-band (INSERT is permitted for the postgres role) and matches the
-- Vercel CRON_SECRET env var.

create schema if not exists private;

create table private.cron_settings (
  key text primary key,
  value text not null
);

insert into private.cron_settings (key, value) values
  ('cron_url', 'https://hiyame-five.vercel.app/api/cron/introductions')
on conflict (key) do nothing;

select cron.unschedule('introductions-email-tick');

select cron.schedule(
  'introductions-email-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := (select value from private.cron_settings where key = 'cron_url'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || coalesce((select value from private.cron_settings where key = 'cron_secret'), ''),
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  )
  where exists (select 1 from private.cron_settings where key = 'cron_secret')
  $$
);
