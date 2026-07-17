-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-05-02).
-- Brand voice scaffolding for richer prompt grounding.
-- Used by buildContentPrompt to enforce voice formula + signature sign-off.

ALTER TABLE personas ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS voice_formula text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS signature_signoff text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS brand_voice_examples jsonb;
