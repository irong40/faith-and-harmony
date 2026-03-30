-- Governance Agent System: Core Tables
-- Migration: Create 5 governance tables with RLS, constraints, indexes, and triggers
--
-- Tables created:
--   1. compliance_obligations (SCHM-01) tracks LLC compliance deadlines
--   2. governance_log (SCHM-02) immutable audit log of agent activity
--   3. governance_decisions (SCHM-03) records founder decisions with action items
--   4. financial_actuals (SCHM-04) monthly financial snapshots for variance analysis
--   5. budget_baselines (SCHM-08 table) annual budget targets from business plan

-- ============================================================================
-- Table 1: compliance_obligations (SCHM-01)
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

COMMENT ON TABLE public.compliance_obligations IS 'Tracks all LLC compliance obligations with due dates and recurrence patterns';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_compliance_obligations_due_status
  ON public.compliance_obligations (due_date, status);

CREATE INDEX IF NOT EXISTS idx_compliance_obligations_category
  ON public.compliance_obligations (category);

-- RLS
ALTER TABLE public.compliance_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.compliance_obligations
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_all_compliance_obligations" ON public.compliance_obligations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER set_compliance_obligations_updated_at
  BEFORE UPDATE ON public.compliance_obligations
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);


-- ============================================================================
-- Table 2: governance_log (SCHM-02) -- IMMUTABLE AUDIT LOG
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

COMMENT ON TABLE public.governance_log IS 'Immutable audit log of all governance agent activity';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_governance_log_agent_created
  ON public.governance_log (agent_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_governance_log_fiscal_quarter
  ON public.governance_log (fiscal_year, quarter);

-- RLS: service_role gets full access, admin gets SELECT only (immutable log)
ALTER TABLE public.governance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.governance_log
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_read_governance_log" ON public.governance_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- NO updated_at column, NO moddatetime trigger (immutable)


-- ============================================================================
-- Table 3: governance_decisions (SCHM-03)
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

COMMENT ON TABLE public.governance_decisions IS 'Records founder governance decisions with action items';

-- Index
CREATE INDEX IF NOT EXISTS idx_governance_decisions_fiscal_quarter
  ON public.governance_decisions (fiscal_year, quarter);

-- RLS
ALTER TABLE public.governance_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.governance_decisions
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_all_governance_decisions" ON public.governance_decisions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER set_governance_decisions_updated_at
  BEFORE UPDATE ON public.governance_decisions
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);


-- ============================================================================
-- Table 4: financial_actuals (SCHM-04)
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

COMMENT ON TABLE public.financial_actuals IS 'Monthly financial snapshots for variance analysis against budget';

-- Index on month (UNIQUE already creates one, but explicit for clarity in queries)
CREATE INDEX IF NOT EXISTS idx_financial_actuals_month
  ON public.financial_actuals (month);

-- RLS
ALTER TABLE public.financial_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.financial_actuals
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_all_financial_actuals" ON public.financial_actuals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER set_financial_actuals_updated_at
  BEFORE UPDATE ON public.financial_actuals
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);


-- ============================================================================
-- Table 5: budget_baselines (SCHM-08 table creation)
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

COMMENT ON TABLE public.budget_baselines IS 'Annual budget targets from business plan for agent variance analysis';

-- RLS: service_role full access, admin SELECT only (reference data)
ALTER TABLE public.budget_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.budget_baselines
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_read_budget_baselines" ON public.budget_baselines
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- NO moddatetime trigger (reference data, not routinely updated)
