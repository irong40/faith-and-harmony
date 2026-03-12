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
  residential_revenue: number;
  commercial_revenue: number;
  retainer_revenue: number;
  other_revenue: number;
  jobs_completed: number;
  equipment_expense: number;
  insurance_expense: number;
  vehicle_expense: number;
  marketing_expense: number;
  software_expense: number;
  training_expense: number;
  office_expense: number;
  misc_expense: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetBaseline {
  id: string;
  fiscal_year: number;
  annual_revenue_target: number;
  annual_expense_budget: number;
  annual_job_target: number;
  monthly_revenue_target: number;
  monthly_expense_budget: number;
  monthly_job_target: number;
  net_income_target: number;
  margin_target: number;
  created_at: string;
}
