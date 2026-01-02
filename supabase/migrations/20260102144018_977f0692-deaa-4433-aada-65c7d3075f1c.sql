-- Add delivery token columns to drone_jobs
ALTER TABLE drone_jobs ADD COLUMN IF NOT EXISTS delivery_token text UNIQUE;
ALTER TABLE drone_jobs ADD COLUMN IF NOT EXISTS delivery_token_created_at timestamptz;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_drone_jobs_delivery_token ON drone_jobs(delivery_token) WHERE delivery_token IS NOT NULL;

-- Customers can view their delivered job via delivery token
CREATE POLICY "Customers can view delivered jobs via delivery token"
ON drone_jobs FOR SELECT
USING (
  delivery_token IS NOT NULL 
  AND status = 'delivered'
);

-- Customers can view deliverables for their delivered job
CREATE POLICY "Customers can view deliverables via delivery token"  
ON drone_deliverables FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drone_jobs 
    WHERE drone_jobs.id = drone_deliverables.job_id
    AND drone_jobs.delivery_token IS NOT NULL
    AND drone_jobs.status = 'delivered'
  )
);

-- Customers can view assets for their delivered job (for gallery preview)
CREATE POLICY "Customers can view assets via delivery token"
ON drone_assets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drone_jobs 
    WHERE drone_jobs.id = drone_assets.job_id
    AND drone_jobs.delivery_token IS NOT NULL
    AND drone_jobs.status = 'delivered'
  )
);