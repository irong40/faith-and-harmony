-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-07-03).
-- Partial apply of repo migration 005 (fhcontent-creator-v2), 2026-07-02.
-- performance_metrics + evergreen/hook columns only. content_ideas SKIPPED:
-- its FK targets brands(id) but this shared instance's brands table is a
-- different app's (slug-keyed, no id column).
-- Purpose: engagement feedback loop (weekly yt-dlp collector on the music
-- machine -> performance_metrics -> winner-aware Sunday topic generation).

CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_piece_id UUID NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    comments INT DEFAULT 0,
    captured_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_perf_metrics_piece ON performance_metrics(content_piece_id);
CREATE INDEX idx_perf_metrics_platform ON performance_metrics(platform);
CREATE INDEX idx_perf_metrics_captured ON performance_metrics(captured_at);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to performance_metrics"
    ON performance_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE topics ADD COLUMN is_evergreen BOOLEAN DEFAULT false;

ALTER TABLE content_pieces ADD COLUMN hook_performance TEXT;
