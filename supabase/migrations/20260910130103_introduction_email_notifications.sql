-- Email notifications for the introduction lifecycle (architecture doc §7.4),
-- sent via Resend from the api/notify-introduction serverless function.
-- These timestamps make each notification fire at most once — the endpoint
-- sets them with the service-role key after a successful send, and skips if
-- already set.
--
-- (The halfway-point reminder from §7.4 needs a scheduled job and is a
-- separate milestone; reminder_sent_at already exists on the table for it.)

alter table introductions add column notified_sent_at timestamptz;
alter table introductions add column notified_accepted_at timestamptz;
