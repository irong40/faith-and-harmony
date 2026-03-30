-- Update FY2026 budget baseline to match March 2026 updated business plan.
-- Previous values from Feb 2026 slide deck; updated values from FH_Business_Plan_Updated_March2026.docx.

UPDATE public.budget_baselines SET
  label = 'Year 1 Business Plan (March 2026 Update)',
  revenue_target = 98000,
  expense_budget = 58000,
  net_income_target = 40000,
  net_margin_target = 0.41,
  job_volume_target = 204,
  monthly_revenue_avg = 8167,
  monthly_expense_avg = 4833,
  monthly_jobs_avg = 17,
  revenue_mix = '{"residential": {"pct": 0.80, "avg_job": 388}, "commercial": {"pct": 0.20, "avg_job": 825}, "retainer": {"pct": 0.05, "monthly": 1500}}'::jsonb,
  expense_categories = '{"equipment": 19185, "software": 3000, "insurance": 1800, "marketing": 2400, "vehicle": 4800, "professional": 800, "misc": 1200, "training": 600, "cloud_storage": 480, "faa_compliance": 200}'::jsonb
WHERE fiscal_year = 2026;
