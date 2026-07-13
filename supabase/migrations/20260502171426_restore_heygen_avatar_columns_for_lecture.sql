-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-05-02).
-- Restore HeyGen avatar columns. CMIT 291 lecture pipeline (commit 3f3f523)
-- still uses HeyGen avatars for educational long-form content.
-- Earlier strip migration was too aggressive — only Canva is fully dead.

ALTER TABLE personas ADD COLUMN IF NOT EXISTS heygen_avatar_id text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS heygen_voice_id text;
