export type ComplianceStatus = "pending" | "in_progress" | "complete" | "overdue" | "waived";

export interface ComplianceObligation {
  id: string;
  obligation_name: string;
  category: string;
  description: string | null;
  due_date: string;
  recurrence: string | null;
  status: ComplianceStatus;
  owner: string;
  source_document: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GovernanceLog {
  id: string;
  agent_name: string;
  event_type: string;
  summary: string;
  document_url: string | null;
  data_snapshot: Record<string, unknown> | null;
  quarter: string | null;
  fiscal_year: number | null;
  created_at: string;
}

export interface GovernanceDecision {
  id: string;
  decision_date: string;
  title: string;
  context: string | null;
  outcome: string;
  action_items: string[];
  participants: string[];
  quarter: string | null;
  fiscal_year: number | null;
  created_at: string;
}

export interface FinancialActual {
  id: string;
  month: string;
  revenue_residential: number;
  revenue_commercial: number;
  revenue_retainer: number;
  revenue_other: number;
  jobs_completed: number;
  expense_equipment: number;
  expense_software: number;
  expense_insurance: number;
  expense_marketing: number;
  expense_vehicle: number;
  expense_professional: number;
  expense_contractor: number;
  expense_misc: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetBaseline {
  id: string;
  fiscal_year: number;
  label: string;
  revenue_target: number;
  expense_budget: number;
  net_income_target: number;
  net_margin_target: number;
  job_volume_target: number;
  monthly_revenue_avg: number;
  monthly_expense_avg: number;
  monthly_jobs_avg: number;
  revenue_mix: Record<string, unknown>;
  expense_categories: Record<string, number>;
  created_at: string;
}
