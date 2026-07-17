-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-05-02).
-- Anthology rotation: each topic uses one of three logo variants
-- across all its content pieces. Cycles 1 → 2 → 3 → 1 by per-persona topic count.
-- 1 = refined wordmark (Concept 1)
-- 2 = HUVA monogram (Concept 2)
-- 3 = torn-parchment social icon (Concept 3)

ALTER TABLE topics
    ADD COLUMN IF NOT EXISTS logo_variant smallint
        CHECK (logo_variant BETWEEN 1 AND 3);

-- Function: assign next variant on insert based on persona's existing count
CREATE OR REPLACE FUNCTION assign_logo_variant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    n_existing integer;
BEGIN
    IF NEW.logo_variant IS NULL THEN
        SELECT COUNT(*) INTO n_existing
        FROM topics
        WHERE persona_id = NEW.persona_id;
        NEW.logo_variant := (n_existing % 3) + 1;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS topics_assign_logo_variant ON topics;
CREATE TRIGGER topics_assign_logo_variant
    BEFORE INSERT ON topics
    FOR EACH ROW
    EXECUTE FUNCTION assign_logo_variant();

-- Backfill existing Dr. Carter topics (in chronological order)
WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY persona_id ORDER BY created_at) - 1 AS idx
    FROM topics
    WHERE logo_variant IS NULL
)
UPDATE topics t
SET logo_variant = (o.idx % 3) + 1
FROM ordered o
WHERE t.id = o.id;
