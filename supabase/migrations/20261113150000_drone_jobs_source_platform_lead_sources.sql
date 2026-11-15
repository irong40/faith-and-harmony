-- Marketing plan v2 job P5: let drone_jobs.source_platform carry the lead source.
-- Widen only. Original allowed list (aircraft): mini4pro, m4e, m3e (+ NULL).
-- Superset keeps every original value. Undo of the data: set source_platform back
-- to NULL on the rows changed; the wider constraint may stay.
ALTER TABLE public.drone_jobs DROP CONSTRAINT drone_jobs_source_platform_check;
ALTER TABLE public.drone_jobs ADD CONSTRAINT drone_jobs_source_platform_check
  CHECK (source_platform IS NULL OR source_platform = ANY (ARRAY[
    'mini4pro','m4e','m3e',
    'referral','flyguys','zeitview','bees360','droners','web','email','phone','other'
  ]::text[]));
