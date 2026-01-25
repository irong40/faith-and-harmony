-- =====================================================
-- PHOTOGRAMMETRY SUPPORT - Schema Extension
-- =====================================================
-- Adds photogrammetry (3D mapping) support to drone_jobs
-- 1. Create photogrammetry status enum
DO $$ BEGIN CREATE TYPE public.photogrammetry_status AS ENUM (
    'pending',
    'queued',
    'processing',
    'completed',
    'failed'
);
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- 2. Add photogrammetry columns to drone_jobs
ALTER TABLE public.drone_jobs
ADD COLUMN IF NOT EXISTS photogrammetry_status public.photogrammetry_status,
    ADD COLUMN IF NOT EXISTS nodeodm_task_id TEXT,
    ADD COLUMN IF NOT EXISTS model_file_path TEXT,
    ADD COLUMN IF NOT EXISTS orthophoto_path TEXT,
    ADD COLUMN IF NOT EXISTS pointcloud_path TEXT,
    ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS processing_error TEXT,
    ADD COLUMN IF NOT EXISTS processing_options JSONB DEFAULT '{}';
-- 3. Add index for efficient polling by worker
CREATE INDEX IF NOT EXISTS idx_drone_jobs_photogrammetry_status ON public.drone_jobs(photogrammetry_status)
WHERE photogrammetry_status IS NOT NULL;
-- 4. Add comment for documentation
COMMENT ON COLUMN public.drone_jobs.photogrammetry_status IS 'Status of NodeODM photogrammetry processing: pending, queued, processing, completed, failed';
COMMENT ON COLUMN public.drone_jobs.nodeodm_task_id IS 'UUID returned by NodeODM when task is created';
COMMENT ON COLUMN public.drone_jobs.model_file_path IS 'Supabase storage path to 3D model (.obj or .glb)';
COMMENT ON COLUMN public.drone_jobs.orthophoto_path IS 'Supabase storage path to orthophoto (georeferenced aerial map)';
COMMENT ON COLUMN public.drone_jobs.pointcloud_path IS 'Supabase storage path to point cloud file (.ply or .las)';
COMMENT ON COLUMN public.drone_jobs.processing_options IS 'NodeODM processing options: dsm, orthophoto, mesh-octree-depth, etc.';