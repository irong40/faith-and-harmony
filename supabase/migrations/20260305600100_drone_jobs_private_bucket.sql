-- Revert the drone-jobs bucket to private so full resolution originals
-- require signed URL access. Clients cannot download originals before
-- payment. The service role key (used by n8n and admin UI) bypasses RLS,
-- so admin and pipeline operations continue working unchanged. The anon
-- key will no longer grant read access, which is the intended behavior.

UPDATE storage.buckets
SET public = false
WHERE id = 'drone-jobs';

-- Drop public read policies that were granting anonymous access
DROP POLICY IF EXISTS "drone_jobs_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- Authenticated upload, update, and delete policies remain intact.
-- Service role key bypasses RLS entirely, so n8n and admin operations
-- are unaffected by this change.
