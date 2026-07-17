-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-07-03).
-- Codex review 2026-07-02 findings 1+2: the daily-topic cron did winner
-- aggregation client-side (unbounded rows past PostgREST's max-rows cap ->
-- partial slices rank wrong winners) and swallowed supabase-js errors.
-- Server-side RPC: latest snapshot per (piece, platform) in the window,
-- summed per topic, ranked by views. Single small result set, one error path.
CREATE OR REPLACE FUNCTION get_topic_winners(
    p_persona_id UUID,
    p_days INT DEFAULT 10,
    p_limit INT DEFAULT 8
) RETURNS TABLE(
    title TEXT,
    views BIGINT,
    likes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest AS (
        SELECT DISTINCT ON (pm.content_piece_id, pm.platform)
               pm.views, pm.likes, cp.topic_id
        FROM performance_metrics pm
        JOIN content_pieces cp ON cp.id = pm.content_piece_id
        WHERE pm.captured_at >= now() - make_interval(days => p_days)
        ORDER BY pm.content_piece_id, pm.platform, pm.captured_at DESC
    )
    SELECT t.title, SUM(l.views)::BIGINT, SUM(l.likes)::BIGINT
    FROM latest l
    JOIN topics t ON t.id = l.topic_id
    WHERE t.persona_id = p_persona_id
    GROUP BY t.id, t.title
    ORDER BY SUM(l.views) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
