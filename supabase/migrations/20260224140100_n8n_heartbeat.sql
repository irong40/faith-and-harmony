-- Phase 3: n8n_heartbeat table
-- Single-row-per-instance upsert pattern for n8n health monitoring.
-- Authenticated users can read; service_role (n8n via edge function) writes.

CREATE TABLE public.n8n_heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id TEXT NOT NULL DEFAULT 'primary',
  last_ping TIMESTAMPTZ NOT NULL DEFAULT now(),
  workflow_count INT,
  active_executions INT,
  version TEXT,
  metadata JSONB
);

-- One row per n8n instance; upsert uses this unique index
CREATE UNIQUE INDEX idx_n8n_heartbeat_instance ON public.n8n_heartbeat(instance_id);

-- RLS: anyone authenticated can read, service_role writes
ALTER TABLE public.n8n_heartbeat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read heartbeat"
  ON public.n8n_heartbeat FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages heartbeat"
  ON public.n8n_heartbeat FOR ALL TO service_role USING (true);
