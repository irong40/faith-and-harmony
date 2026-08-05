-- Privatize report imagery: the DATA half of the bucket privatization.
--
-- Step 2 (code) shipped in 7e26d35 and resolves images two ways: a value
-- starting with "http" loads as-is, and a scheme-less value is treated as an
-- object path in the private `report-images` bucket and signed via
-- createSignedUrl(). The rows were never migrated, so every report_images row
-- still held an absolute URL into the PUBLIC `media` bucket and the imagery was
-- readable by anyone with the link, unauthenticated. Verified live before this
-- change: HTTP 200, full image bytes, no credentials.
--
-- The objects themselves were copied media/report-images/** -> report-images/**
-- via the Storage API before this ran, and the public originals deleted after.
-- Blobs are keyed by <bucket>/<name> in the backing store, so rewriting
-- storage.objects.bucket_id here would orphan them. Never do that.
--
-- `media` is deliberately left public: it also serves the content pipeline
-- (music, shorts, longform, quiz, quotes, branded-cards and ~100 post folders).
-- Only the report-images/ prefix moved.
--
-- Idempotent: after this runs the LIKE no longer matches, so re-running is a
-- no-op, and rows already holding an object path are untouched.

update public.report_images
set image_url = regexp_replace(
      image_url,
      '^https://[^/]+/storage/v1/object/public/media/report-images/',
      ''
    )
where image_url like '%/storage/v1/object/public/media/report-images/%';

update public.report_images
set thumbnail_url = regexp_replace(
      thumbnail_url,
      '^https://[^/]+/storage/v1/object/public/media/report-images/',
      ''
    )
where thumbnail_url like '%/storage/v1/object/public/media/report-images/%';
