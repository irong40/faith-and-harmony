-- Create drone-jobs storage bucket for raw and processed files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drone-jobs', 
  'drone-jobs', 
  false,
  104857600,
  ARRAY['image/jpeg', 'image/png', 'image/dng', 'image/tiff', 'video/mp4', 'video/quicktime']
);

-- RLS: Admins can manage all drone files
CREATE POLICY "Admins can manage drone files"
ON storage.objects FOR ALL
USING (bucket_id = 'drone-jobs' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'drone-jobs' AND has_role(auth.uid(), 'admin'::app_role));

-- RLS: Token holders can upload to their job folder
CREATE POLICY "Token holders can upload drone files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'drone-jobs' 
  AND EXISTS (
    SELECT 1 FROM public.drone_jobs 
    WHERE upload_token IS NOT NULL 
    AND upload_token_expires_at > now()
    AND (storage.foldername(name))[1] = id::text
  )
);

-- RLS: Token holders can view their job files
CREATE POLICY "Token holders can view drone files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'drone-jobs' 
  AND EXISTS (
    SELECT 1 FROM public.drone_jobs 
    WHERE upload_token IS NOT NULL 
    AND upload_token_expires_at > now()
    AND (storage.foldername(name))[1] = id::text
  )
);