-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-06-03).
-- Marketplace (Zeitview/FlyGuys) offer workflow on zeitview_jobs.
-- Additive only. Status vocabulary: offered -> declined | accepted -> received | not_awarded.
ALTER TABLE public.zeitview_jobs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'zeitview',
  ADD COLUMN IF NOT EXISTS direct_equiv_price numeric,
  ADD COLUMN IF NOT EXISTS direct_equiv_package text,
  ADD COLUMN IF NOT EXISTS drone_job_id uuid REFERENCES public.drone_jobs(id),
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS awarded_outcome_at timestamptz;

COMMENT ON COLUMN public.zeitview_jobs.source IS 'Marketplace board: zeitview | flyguys';
COMMENT ON COLUMN public.zeitview_jobs.direct_equiv_price IS 'INTERNAL decision data only — what we''d bill at our own drone_packages rate if this were a direct mission. Never shown to clients/boards.';
COMMENT ON COLUMN public.zeitview_jobs.status IS 'offered (new, awaiting Adam) | declined | accepted (interested, awaiting board) | received (board awarded -> drone_job) | not_awarded (board chose someone else)';
