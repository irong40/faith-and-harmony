import type { Json } from '@/integrations/supabase/types';

export type ProcessingStepStatus = 'waiting' | 'running' | 'complete' | 'failed' | 'skipped';

export interface ProcessingTemplate {
  id: string;
  package_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface ProcessingStep {
  id: string;
  mission_id: string;
  step_name: string;
  step_order: number;
  status: ProcessingStepStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  items_processed: number;
  created_at: string;
}

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

export interface PipelineJob {
  id: string;
  job_number: string;
  property_address: string;
  status: string;
  scheduled_date: string | null;
  customers: { name: string; email: string } | null;
  drone_packages: { name: string; code: string } | null;
  processing_steps: ProcessingStep[];
}

export const PIPELINE_STEPS = [
  'file_detect',
  'exif_extract',
  'coverage_check',
  'lightroom_edit',
  'qa_gate',
  'packaging',
  'delivery',
] as const;

export type PipelineStepName = (typeof PIPELINE_STEPS)[number];

export const STEP_STATUS_CONFIG: Record<
  ProcessingStepStatus,
  { label: string; color: string; bgColor: string }
> = {
  waiting: { label: 'Waiting', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  running: { label: 'Running', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  complete: { label: 'Complete', color: 'text-green-600', bgColor: 'bg-green-100' },
  failed: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
  skipped: { label: 'Skipped', color: 'text-gray-400', bgColor: 'bg-gray-100' },
};

export const STEP_LABEL_MAP: Record<PipelineStepName, string> = {
  file_detect: 'File Detection',
  exif_extract: 'EXIF Extraction',
  coverage_check: 'Coverage Check',
  lightroom_edit: 'Lightroom Edit',
  qa_gate: 'QA Gate',
  packaging: 'Packaging',
  delivery: 'Delivery',
};
