-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-06-09).
-- Hybrid Value-Based pricing layer on top of the legacy cost-plus mission_costings.
-- Purely additive: extends the existing internal costing record so the new
-- Trestle Costing & Quoting Engine can persist airspace fees, the call-out floor,
-- commercial day rates, and the 3-tier value packages. No existing columns touched.

ALTER TABLE public.mission_costings
  ADD COLUMN IF NOT EXISTS mission_id          uuid REFERENCES public.drone_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_mode          text    NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS is_residential      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS laanc_required      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS laanc_fee           numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS caps_required       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS caps_fee            numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS airspace_fees       numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS break_even_floor    numeric,
  ADD COLUMN IF NOT EXISTS min_callout_floor   numeric NOT NULL DEFAULT 350,
  ADD COLUMN IF NOT EXISTS min_callout_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommended_quote   numeric,
  ADD COLUMN IF NOT EXISTS full_day_rate       numeric,
  ADD COLUMN IF NOT EXISTS half_day_rate       numeric,
  ADD COLUMN IF NOT EXISTS value_tiers         jsonb;

ALTER TABLE public.mission_costings DROP CONSTRAINT IF EXISTS mission_costings_quote_mode_check;
ALTER TABLE public.mission_costings
  ADD CONSTRAINT mission_costings_quote_mode_check
  CHECK (quote_mode IN ('standard','commercial_day','value_tiered'));

CREATE INDEX IF NOT EXISTS idx_mission_costings_mission_id ON public.mission_costings(mission_id);

COMMENT ON COLUMN public.mission_costings.value_tiers IS
  'Hybrid value-based 3-tier package recommendation: [{name,total,deliverables}] for Basic/Pro/Enterprise advanced-data missions';
COMMENT ON COLUMN public.mission_costings.recommended_quote IS
  'Final client-facing recommended quote after airspace fees + minimum call-out floor (NULL for value_tiered mode)';
