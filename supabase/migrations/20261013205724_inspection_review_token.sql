-- Single-use review link for inspection runs (Adam 2026-10-13: signed link, edge function only).
-- Only the sha256 of the token is stored; the raw token exists only in Adam's email.
--
-- Single use comes from the existing guard in 20261013200906: once a run is
-- approved or rejected, inspection_runs_guard() lets only review_notes and
-- updated_at change, so these token columns are frozen with the decision and a
-- second click finds the run closed. While a run is awaiting_review the token
-- may be rotated (resend), because the status does not change.
--
-- The edge function inspection-review reads these columns with the service
-- role; RLS on inspection_runs is unchanged (anon has no access).
alter table public.inspection_runs
  add column if not exists review_token_hash text null unique,
  add column if not exists review_token_expires_at timestamptz null,
  add column if not exists review_email_sent_at timestamptz null;

alter table public.inspection_runs drop constraint if exists inspection_runs_token_pair;
alter table public.inspection_runs add constraint inspection_runs_token_pair check (
  (review_token_hash is null) = (review_token_expires_at is null));

comment on column public.inspection_runs.review_token_hash is
  'sha256 hex of the single-use review-link token. The raw token is never stored.';
comment on column public.inspection_runs.review_token_expires_at is
  'Review link expiry (7 days after it was minted). Set together with review_token_hash.';
comment on column public.inspection_runs.review_email_sent_at is
  'When inspection-review last emailed the review link to Adam.';
