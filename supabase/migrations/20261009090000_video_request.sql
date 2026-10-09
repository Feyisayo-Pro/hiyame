-- Lets a company that's connected to a candidate (accepted introduction)
-- ask them to upload a video introduction, and lets the candidate side know
-- a request is outstanding so it can prompt them. One flag per candidate
-- (not per-introduction) is enough: the UI question is just "does anyone
-- want my video and I haven't uploaded one yet" — tracking which specific
-- company asked isn't needed for that, and would just be more state to keep
-- in sync. Cleared automatically the moment a video is actually uploaded
-- (api/video-intro.ts's existing 'complete' handler for kind: 'video').

alter table candidates add column video_requested_at timestamptz;

-- Written only by api/notify-introduction.ts's service-role client (same as
-- every other cross-boundary write in this schema) — no RLS policy needed
-- since the authenticated company_users role never gets a grant on this
-- column; the existing candidates_update_own policy already lets a
-- candidate clear it themselves if that's ever wanted directly instead of
-- only via upload, so no column-grant change needed there either.
