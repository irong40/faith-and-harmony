-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-05-06).
CREATE TABLE IF NOT EXISTS public.n8n_failures (
  id              bigserial PRIMARY KEY,
  workflow_id     text NOT NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  status_code     int,
  error_message   text,
  payload         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_n8n_failures_workflow_time
  ON public.n8n_failures (workflow_id, occurred_at DESC);

ALTER TABLE public.n8n_failures ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.n8n_failures IS 'n8n workflow failures logged here. Heartbeat WF4 emails Adam after 6+ consecutive failures (~30 min outage).';
