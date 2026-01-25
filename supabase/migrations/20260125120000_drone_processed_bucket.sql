-- Create storage bucket for processed drone assets (3D models, orthos)
INSERT INTO storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    )
VALUES (
        'drone-processed-assets',
        'drone-processed-assets',
        true,
        null,
        -- No size limit (models can be huge)
        null -- Allow all types (obj, mtl, tif, jpg, etc)
    ) ON CONFLICT (id) DO NOTHING;
-- Policy: Anyone can view (public)
CREATE POLICY "Public Access" ON storage.objects FOR
SELECT USING (bucket_id = 'drone-processed-assets');
-- Policy: Service role (admin) can upload/update/delete
-- Note: Service role bypasses RLS, so this is mainly for authenticated users if needed.
-- But the worker uses service role, so it should be fine.
CREATE POLICY "Authenticated Upload" ON storage.objects FOR
INSERT WITH CHECK (
        bucket_id = 'drone-processed-assets'
        AND auth.role() = 'authenticated'
    );
CREATE POLICY "Authenticated Update" ON storage.objects FOR
UPDATE USING (
        bucket_id = 'drone-processed-assets'
        AND auth.role() = 'authenticated'
    );