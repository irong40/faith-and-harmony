-- Add archived_at column to admin-managed tables for soft-delete/archive support
-- Null = active, timestamp = archived

ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

-- Index for fast filtering on active records
CREATE INDEX IF NOT EXISTS idx_quote_requests_archived ON quote_requests (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_archived ON proposals (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_archived ON invoices (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_requests_archived ON service_requests (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects (archived_at) WHERE archived_at IS NULL;
