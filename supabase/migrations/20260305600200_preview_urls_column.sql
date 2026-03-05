-- Add preview_urls column to drone_jobs for storing public URLs of
-- watermarked preview thumbnails. These URLs point to the public
-- watermark-previews bucket and are embedded in balance due emails.

ALTER TABLE public.drone_jobs
ADD COLUMN IF NOT EXISTS preview_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.drone_jobs.preview_urls IS
  'Public URLs of watermarked preview thumbnails in the watermark-previews bucket, populated by the n8n pipeline watermark step';
