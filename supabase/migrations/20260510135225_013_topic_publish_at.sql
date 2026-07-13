-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-05-10).
ALTER TABLE topics
    ADD COLUMN IF NOT EXISTS publish_at timestamptz;

UPDATE topics
SET publish_at = (publish_date::timestamp + interval '13 hours') AT TIME ZONE 'UTC'
WHERE publish_at IS NULL
  AND publish_date IS NOT NULL
  AND status IN ('scheduled', 'approved');

CREATE INDEX IF NOT EXISTS idx_topics_publish_at
    ON topics (publish_at)
    WHERE status IN ('scheduled', 'approved', 'partially_published');
