-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-05-02).
-- Fix duplicate-topic generation: also check topics table (any status, last 90 days)
-- not just published_log. Prior bug: May 1 + May 2 both generated Gabriel Prosser
-- because neither was published yet, so neither blocked the other.

CREATE OR REPLACE FUNCTION public.check_duplicate_topic(
    p_persona_id uuid,
    p_title text,
    p_threshold double precision DEFAULT 0.8
)
RETURNS TABLE(is_duplicate boolean, similar_title text, similarity double precision)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH combined AS (
        SELECT topic_title AS title FROM published_log
        WHERE persona_id = p_persona_id
          AND published_at > now() - interval '90 days'
        UNION ALL
        SELECT title FROM topics
        WHERE persona_id = p_persona_id
          AND created_at > now() - interval '90 days'
          AND status NOT IN ('failed', 'archived')
    )
    SELECT
        similarity(lower(p_title), lower(c.title)) > p_threshold AS is_duplicate,
        c.title AS similar_title,
        similarity(lower(p_title), lower(c.title)) AS similarity
    FROM combined c
    ORDER BY similarity DESC
    LIMIT 1;
END;
$function$;
