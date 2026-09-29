-- Notification for a scheduled interview (email via Resend + in-app push to
-- the candidate), same idempotency pattern as introductions'
-- notified_sent_at/notified_accepted_at (20260910130103): the
-- api/notify-interview endpoint sets this with the service-role key after a
-- successful send and skips if already set.

alter table interviews add column notified_scheduled_at timestamptz;
