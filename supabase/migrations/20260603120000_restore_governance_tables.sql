-- ============================================================================
-- RESTORE GOVERNANCE TABLES (forward migration)
-- ============================================================================
-- Re-creates the governance backend dropped by 20260409100000_drop_dead_weight_tables.
-- The governance feature is being restored (command-center initiative, 2026-06-03).
-- Faithful re-creation of 20260312200000/200100/200200. Idempotent and safe to re-run.
-- NOTE: the original drop SKIPPED the storage bucket (Supabase blocks bucket DELETE),
-- so the 'governance' bucket + its storage policy likely still exist — guarded below.

BEGIN;

-- ============================================================================
-- Table 1: compliance_obligations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_obligations (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL,
  obligation_name  text        NOT NULL,
  category         text        NOT NULL CHECK (category IN ('legal', 'insurance', 'regulatory', 'financial', 'operational', 'hr')),
  description      text,
  due_date         date        NOT NULL,
  recurrence       text        NOT NULL CHECK (recurrence IN ('monthly', 'quarterly', 'annual', 'biennial', 'one_time', 'as_needed')),
  status           text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'overdue', 'waived')),
  owner            text        NOT NULL DEFAULT 'founder',
  source_document  text,
  notes            text,
  completed_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_compliance_obligations_due_status ON public.compliance_obligations (due_date, status);
CREATE INDEX IF NOT EXISTS idx_compliance_obligations_category ON public.compliance_obligations (category);
ALTER TABLE public.compliance_obligations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.compliance_obligations;
CREATE POLICY "service_role_all" ON public.compliance_obligations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "admins_all_compliance_obligations" ON public.compliance_obligations;
CREATE POLICY "admins_all_compliance_obligations" ON public.compliance_obligations
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP TRIGGER IF EXISTS set_compliance_obligations_updated_at ON public.compliance_obligations;
CREATE TRIGGER set_compliance_obligations_updated_at
  BEFORE UPDATE ON public.compliance_obligations
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================================================
-- Table 2: governance_log (immutable audit log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.governance_log (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz DEFAULT now() NOT NULL,
  agent_name     text        NOT NULL CHECK (agent_name IN ('governance_scribe', 'compliance_sentinel', 'financial_analyst', 'document_drafter', 'manual')),
  event_type     text        NOT NULL CHECK (event_type IN ('generation', 'reminder', 'status_change', 'manual_entry')),
  summary        text        NOT NULL,
  document_url   text,
  data_snapshot  jsonb,
  quarter        text        CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  fiscal_year    integer
);
CREATE INDEX IF NOT EXISTS idx_governance_log_agent_created ON public.governance_log (agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_log_fiscal_quarter ON public.governance_log (fiscal_year, quarter);
ALTER TABLE public.governance_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.governance_log;
CREATE POLICY "service_role_all" ON public.governance_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "admins_read_governance_log" ON public.governance_log;
CREATE POLICY "admins_read_governance_log" ON public.governance_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- Table 3: governance_decisions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.governance_decisions (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz DEFAULT now() NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL,
  decision_date  date        NOT NULL,
  title          text        NOT NULL,
  context        text,
  outcome        text        NOT NULL,
  action_items   jsonb       DEFAULT '[]'::jsonb,
  participants   jsonb       DEFAULT '["D. Pierce (Founder/Managing Member)"]'::jsonb,
  quarter        text        CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  fiscal_year    integer
);
CREATE INDEX IF NOT EXISTS idx_governance_decisions_fiscal_quarter ON public.governance_decisions (fiscal_year, quarter);
ALTER TABLE public.governance_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.governance_decisions;
CREATE POLICY "service_role_all" ON public.governance_decisions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "admins_all_governance_decisions" ON public.governance_decisions;
CREATE POLICY "admins_all_governance_decisions" ON public.governance_decisions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP TRIGGER IF EXISTS set_governance_decisions_updated_at ON public.governance_decisions;
CREATE TRIGGER set_governance_decisions_updated_at
  BEFORE UPDATE ON public.governance_decisions
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================================================
-- Table 4: financial_actuals
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.financial_actuals (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            timestamptz DEFAULT now() NOT NULL,
  updated_at            timestamptz DEFAULT now() NOT NULL,
  month                 date        NOT NULL UNIQUE,
  revenue_residential   numeric     DEFAULT 0,
  revenue_commercial    numeric     DEFAULT 0,
  revenue_retainer      numeric     DEFAULT 0,
  revenue_other         numeric     DEFAULT 0,
  jobs_completed        integer     DEFAULT 0,
  expense_equipment     numeric     DEFAULT 0,
  expense_software      numeric     DEFAULT 0,
  expense_insurance     numeric     DEFAULT 0,
  expense_marketing     numeric     DEFAULT 0,
  expense_vehicle       numeric     DEFAULT 0,
  expense_professional  numeric     DEFAULT 0,
  expense_contractor    numeric     DEFAULT 0,
  expense_misc          numeric     DEFAULT 0,
  notes                 text
);
CREATE INDEX IF NOT EXISTS idx_financial_actuals_month ON public.financial_actuals (month);
ALTER TABLE public.financial_actuals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.financial_actuals;
CREATE POLICY "service_role_all" ON public.financial_actuals
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "admins_all_financial_actuals" ON public.financial_actuals;
CREATE POLICY "admins_all_financial_actuals" ON public.financial_actuals
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP TRIGGER IF EXISTS set_financial_actuals_updated_at ON public.financial_actuals;
CREATE TRIGGER set_financial_actuals_updated_at
  BEFORE UPDATE ON public.financial_actuals
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================================================
-- Table 5: budget_baselines
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.budget_baselines (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            timestamptz DEFAULT now() NOT NULL,
  fiscal_year           integer     NOT NULL UNIQUE,
  label                 text        NOT NULL,
  revenue_target        numeric     NOT NULL,
  expense_budget        numeric     NOT NULL,
  net_income_target     numeric     NOT NULL,
  net_margin_target     numeric     NOT NULL,
  job_volume_target     integer     NOT NULL,
  monthly_revenue_avg   numeric     NOT NULL,
  monthly_expense_avg   numeric     NOT NULL,
  monthly_jobs_avg      integer     NOT NULL,
  revenue_mix           jsonb       NOT NULL,
  expense_categories    jsonb       NOT NULL
);
ALTER TABLE public.budget_baselines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON public.budget_baselines;
CREATE POLICY "service_role_all" ON public.budget_baselines
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "admins_read_budget_baselines" ON public.budget_baselines;
CREATE POLICY "admins_read_budget_baselines" ON public.budget_baselines
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- Storage bucket (bucket survived the drop; guard the policy)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('governance', 'governance', false, 10485760,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Governance Authenticated Read" ON storage.objects;
CREATE POLICY "Governance Authenticated Read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'governance');

-- ============================================================================
-- Seed data (idempotent)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.compliance_obligations LIMIT 1) THEN
    INSERT INTO public.compliance_obligations (obligation_name, category, description, due_date, recurrence, status, owner, source_document) VALUES
    ('Operating Agreement draft/review', 'legal', 'Annual review of single-member operating agreement', '2026-04-01', 'annual', 'pending', 'founder + attorney', 'Section 7.5.1'),
    ('Virginia LLC annual report', 'regulatory', 'File annual report with Virginia SCC', '2026-09-01', 'annual', 'pending', 'founder', 'Virginia SCC requirement'),
    ('FAA Part 107 renewal', 'regulatory', 'Renew Remote Pilot Certificate', '2028-01-01', 'biennial', 'pending', 'founder', 'FAA Part 107'),
    ('Liability insurance renewal', 'insurance', 'Renew commercial drone liability insurance', '2027-01-01', 'annual', 'pending', 'founder', 'Insurance policy'),
    ('Disability insurance procurement', 'insurance', 'Obtain disability/income protection insurance', '2026-09-01', 'one_time', 'pending', 'founder', 'Section 7.5.5'),
    ('Emergency Operations Binder creation', 'legal', 'Create emergency operations binder with key contacts, passwords, procedures', '2026-06-01', 'one_time', 'pending', 'founder', 'Section 7.5.5'),
    ('Contractor Agreement template review', 'legal', 'Review and finalize independent contractor agreement template', '2026-06-01', 'one_time', 'pending', 'founder + attorney', 'Section 7.5.2'),
    ('Key person insurance evaluation', 'insurance', 'Evaluate need for key person insurance coverage', '2026-12-31', 'annual', 'pending', 'founder', 'Section 7.5.5'),
    ('Data retention policy compliance', 'regulatory', 'Review and enforce client data retention and deletion policy', '2026-06-30', 'quarterly', 'pending', 'founder', 'Section 4.7'),
    ('Equipment maintenance schedule', 'operational', 'Perform monthly equipment inspection and maintenance', '2026-04-01', 'monthly', 'pending', 'founder', 'Operational SOP'),
    ('LAANC/DroneZone authorization refresh', 'regulatory', 'Maintain current LAANC authorizations for controlled airspace operations', '2026-04-01', 'as_needed', 'pending', 'founder', 'FAA DroneZone'),
    ('Tax estimated payments', 'financial', 'File quarterly estimated tax payments to IRS', '2026-04-15', 'quarterly', 'pending', 'founder + CPA', 'IRS quarterly deadlines');
  END IF;
END $$;

INSERT INTO public.budget_baselines (
  fiscal_year, label, revenue_target, expense_budget, net_income_target, net_margin_target,
  job_volume_target, monthly_revenue_avg, monthly_expense_avg, monthly_jobs_avg, revenue_mix, expense_categories
) VALUES (
  2026, 'Year 1 Business Plan (Feb 2026)', 92000, 60000, 32000, 0.35,
  200, 7667, 5000, 17,
  '{"residential": {"pct": 0.80, "avg_job": 400}, "commercial": {"pct": 0.15, "avg_job": 750}, "retainer": {"pct": 0.05, "monthly": 1500}}'::jsonb,
  '{"equipment": 12000, "software": 6000, "insurance": 4800, "marketing": 9600, "vehicle": 7200, "professional": 6000, "contractor": 8400, "misc": 6000}'::jsonb
) ON CONFLICT (fiscal_year) DO NOTHING;

COMMIT;
