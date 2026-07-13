-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-05-02).
-- Strip dead HeyGen and Canva columns from personas + content_pieces.
-- Keeping heygen_job_id and heygen_status on content_pieces (reused by Remotion renderer).

ALTER TABLE personas DROP COLUMN IF EXISTS heygen_avatar_id;
ALTER TABLE personas DROP COLUMN IF EXISTS heygen_voice_id;
ALTER TABLE personas DROP COLUMN IF EXISTS canva_brand_kit_id;
ALTER TABLE personas DROP COLUMN IF EXISTS canva_carousel_template_id;
ALTER TABLE content_pieces DROP COLUMN IF EXISTS canva_design_id;
