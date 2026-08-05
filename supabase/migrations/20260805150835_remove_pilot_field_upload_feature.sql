-- Remove the token-based field-upload feature entirely.
--
-- What it was: an unauthenticated page at /drone-upload/:token where a pilot
-- who is not an admin could push captures (photos, video and RAW: dng, cr2,
-- cr3, nef, arw, orf, rw2) against a job's shot manifest. The audit and early
-- notes called it a "client upload", which was wrong -- the admin UI labels it
-- "Get the files from the field" and it sits at the `scheduled` stage. No
-- client ever needed it.
--
-- Why it goes rather than gets fixed:
--   * It has never been used. `upload_token` has never been non-null on any
--     drone_jobs row, and there are zero objects under any /raw/ prefix in the
--     drone-jobs bucket.
--   * It has never worked. The INSERT policy's EXISTS on drone_jobs raised
--     42501 for anon (has_role not executable) until 20260805145657, and since
--     20260805143509 it cleanly returns false.
--   * SAI has one pilot, who is an admin and ingests locally through Sortie.
--     Subcontracted pilots are not on the roadmap.
--   * Its design checked that a token EXISTED, never that the caller held it,
--     which was part of the drone-job-token attack chain in the 2026-08-01
--     audit.
--
-- Removed alongside this migration: src/pages/DroneUpload.tsx, its route in
-- App.tsx, the generateUploadToken/copyUploadLink handlers and their buttons in
-- admin/DroneJobDetail.tsx, the drone-job-token edge function (source and
-- deployment), and its config.toml entry.
--
-- The `scheduled` step in the admin stepper now points at the Assets tab, which
-- is AdminAssetUpload -- the authenticated path that actually works and is how
-- every real asset has ever arrived.
--
-- If subcontracted pilots ever happen, the correct build is a
-- createSignedUploadUrl issued by an authenticated edge function, which needs
-- no anon INSERT policy and no RLS-visible token at all.
--
-- Verified after: 0 upload_* columns remain on drone_jobs, 0 upload policies
-- remain, and the only surviving policy on the drone-jobs bucket is
-- "Admins can manage drone files". Frontend typecheck clean, 416 tests pass.

drop policy if exists "Token holders can upload drone files" on storage.objects;

alter table public.drone_jobs
  drop column if exists upload_token,
  drop column if exists upload_token_expires_at;
