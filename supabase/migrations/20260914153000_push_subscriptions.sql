-- Web Push subscriptions (architecture doc ADR-4). The doc specifies Expo's
-- native push service, which only exists for a native app build — this app
-- deploys as a website (see the architecture-alignment review), so this is
-- the actual web equivalent: browser Push API + a service worker, stored
-- per-subscription so a send can target every device a user has opted in on.
--
-- One row per browser/device subscription, not per user — the same person
-- can have several (different browsers/devices), and the unique constraint
-- on endpoint means re-subscribing (e.g. after clearing site data) just
-- upserts rather than duplicating.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_auth_user_id_idx on push_subscriptions (auth_user_id);

alter table push_subscriptions enable row level security;
alter table push_subscriptions force row level security;

create policy push_subscriptions_select_own on push_subscriptions
  for select
  using (auth_user_id = auth.uid());

create policy push_subscriptions_insert_own on push_subscriptions
  for insert
  with check (auth_user_id = auth.uid());

create policy push_subscriptions_delete_own on push_subscriptions
  for delete
  using (auth_user_id = auth.uid());

grant select, insert, delete on push_subscriptions to authenticated;
