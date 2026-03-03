import type { Json } from '@/integrations/supabase/types';

// ─── Step status (shared) ───────────────────────────────────────────
export type ProcessingStepStatus = 'pending' | 'running' | 'complete' | 'failed' | 'awaiting_manual_edit';

export const STEP_STATUS_CONFIG: Record<
  ProcessingStepStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: 'Pending', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  running: { label: 'Running', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  complete: { label: 'Complete', color: 'text-green-600', bgColor: 'bg-green-100' },
  failed: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
  awaiting_manual_edit: { label: 'Awaiting Edit', color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

// ─── Step definition (from processing_templates.step_definitions) ───
export interface StepDefinition {
  name: string;
  label: string;
  script: string | null;
  manual: boolean;
}

// ─── Processing job step (from processing_jobs.steps JSONB) ─────────
export interface ProcessingJobStep {
  name: string;
  label?: string;
  script?: string | null;
  manual?: boolean;
  status: ProcessingStepStatus;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  output?: string | null;
}

// ─── Processing job (processing_jobs table row) ─────────────────────
export interface ProcessingJob {
  id: string;
  mission_id: string;
  processing_template_id: string | null;
  status: 'pending' | 'running' | 'awaiting_manual_edit' | 'complete' | 'failed' | 'cancelled';
  current_step: string | null;
  steps: ProcessingJobStep[];
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  triggered_by: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Pipeline job row (processing_jobs + drone_jobs join) ───────────
export interface PipelineJobRow extends ProcessingJob {
  drone_jobs: {
    id: string;
    job_number: string;
    property_address: string;
    status: string;
    customers: { name: string; email: string } | null;
    drone_packages: { name: string; code: string } | null;
  } | null;
}

// ─── Processing template ────────────────────────────────────────────
export interface ProcessingTemplate {
  id: string;
  package_id: string | null;
  path_code: string | null;
  display_name: string | null;
  description: string | null;
  preset_name: string;
  adiat_enabled: boolean;
  qa_threshold: number;
  qa_api_threshold_low: number;
  qa_api_threshold_high: number;
  shot_requirements: Json;
  raw_workflow: boolean;
  lightroom_preset: string | null;
  output_format: string;
  active: boolean;
  default_steps: string[];
  step_definitions: StepDefinition[];
  created_at: string;
  updated_at: string;
}

// ─── Delivery log ───────────────────────────────────────────────────
export interface DeliveryLog {
  id: string;
  mission_id: string;
  output_path: string;
  delivered_at: string;
  file_count: number | null;
  total_size_bytes: number | null;
  recipient_email: string | null;
  notification_sent: boolean;
}
