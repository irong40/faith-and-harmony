-- Seed data for governance agent system.
-- Sources: PRD Section 4.2.2 (compliance), Feb 2026 Business Plan (budget).
-- Idempotent: safe to run multiple times via supabase db reset.

-- Block 1: 12 Compliance Obligations (SCHM-07)
-- Wrapped in DO block checking for empty table since there is no natural unique key.
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

-- Block 2: Year 1 Budget Baseline (SCHM-08)
-- Uses ON CONFLICT (fiscal_year) DO NOTHING since fiscal_year has a UNIQUE constraint.
INSERT INTO public.budget_baselines (
  fiscal_year, label,
  revenue_target, expense_budget, net_income_target, net_margin_target,
  job_volume_target, monthly_revenue_avg, monthly_expense_avg, monthly_jobs_avg,
  revenue_mix, expense_categories
) VALUES (
  2026, 'Year 1 Business Plan (Feb 2026)',
  92000, 60000, 32000, 0.35,
  200, 7667, 5000, 17,
  '{"residential": {"pct": 0.80, "avg_job": 400}, "commercial": {"pct": 0.15, "avg_job": 750}, "retainer": {"pct": 0.05, "monthly": 1500}}'::jsonb,
  '{"equipment": 12000, "software": 6000, "insurance": 4800, "marketing": 9600, "vehicle": 7200, "professional": 6000, "contractor": 8400, "misc": 6000}'::jsonb
) ON CONFLICT (fiscal_year) DO NOTHING;
