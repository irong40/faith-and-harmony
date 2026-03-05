-- Create the watermark-previews public bucket for preview thumbnails.
-- Watermarked preview images are publicly accessible for embedding in
-- balance due emails. n8n uploads via service role key (bypasses RLS).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'watermark-previews',
  'watermark-previews',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous read access to watermarked previews
CREATE POLICY "Public read watermark previews"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'watermark-previews');
