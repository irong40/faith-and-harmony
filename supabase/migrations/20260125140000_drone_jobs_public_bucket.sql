-- Make drone-jobs bucket publicly readable
-- This is required for:
-- 1. Displaying image/video previews in the admin UI
-- 2. Allowing the drone-qa-analyze Edge Function to fetch images
-- Update the bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'drone-jobs';
-- Add a public read policy for the bucket
INSERT INTO storage.policies (bucket_id, name, definition)
SELECT 'drone-jobs',
    'Public read access',
    '(bucket_id = ''drone-jobs''::text)'
WHERE NOT EXISTS (
        SELECT 1
        FROM storage.policies
        WHERE bucket_id = 'drone-jobs'
            AND name = 'Public read access'
    );
-- Alternative: Create RLS policy using standard approach
DROP POLICY IF EXISTS "drone_jobs_public_read" ON storage.objects;
CREATE POLICY "drone_jobs_public_read" ON storage.objects FOR
SELECT TO public USING (bucket_id = 'drone-jobs');
-- Ensure authenticated users can upload
DROP POLICY IF EXISTS "drone_jobs_auth_upload" ON storage.objects;
CREATE POLICY "drone_jobs_auth_upload" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'drone-jobs');
-- Ensure authenticated users can update their uploads
DROP POLICY IF EXISTS "drone_jobs_auth_update" ON storage.objects;
CREATE POLICY "drone_jobs_auth_update" ON storage.objects FOR
UPDATE TO authenticated USING (bucket_id = 'drone-jobs');
-- Ensure authenticated users can delete their uploads
DROP POLICY IF EXISTS "drone_jobs_auth_delete" ON storage.objects;
CREATE POLICY "drone_jobs_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'drone-jobs');