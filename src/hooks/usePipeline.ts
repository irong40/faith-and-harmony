import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProcessingStep, ProcessingTemplate, DeliveryLog, PipelineJob } from '@/types/pipeline';

// ─── Queries ───────────────────────────────────────────────────────

/**
 * Missions currently in pipeline-relevant statuses with their processing steps.
 * 15s poll fallback for environments without realtime.
 */
export function usePipelineJobs() {
  return useQuery({
    queryKey: ['pipeline-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_jobs')
        .select(`
          id, job_number, property_address, status, scheduled_date,
          customers(name, email),
          drone_packages(name, code),
          processing_steps(*)
        `)
        .in('status', ['processing', 'complete', 'qa', 'failed', 'uploaded', 'review_pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PipelineJob[];
    },
    refetchInterval: 15_000,
  });
}

/**
 * Ordered processing steps for a single mission.
 */
export function useMissionSteps(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-steps', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_steps')
        .select('*')
        .eq('mission_id', missionId!)
        .order('step_order', { ascending: true });

      if (error) throw error;
      return data as ProcessingStep[];
    },
    enabled: !!missionId,
  });
}

/**
 * Active processing template for a package. Long staleTime since templates rarely change.
 */
export function useProcessingTemplate(packageId: string | undefined) {
  return useQuery({
    queryKey: ['processing-template', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_templates')
        .select('*')
        .eq('package_id', packageId!)
        .eq('active', true)
        .single();

      if (error) throw error;
      return data as ProcessingTemplate;
    },
    enabled: !!packageId,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Delivery log entries for a mission.
 */
export function useDeliveryLogs(missionId: string | undefined) {
  return useQuery({
    queryKey: ['delivery-logs', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_log')
        .select('*')
        .eq('mission_id', missionId!)
        .order('delivered_at', { ascending: false });

      if (error) throw error;
      return data as DeliveryLog[];
    },
    enabled: !!missionId,
  });
}

/**
 * Steps where qa_gate or coverage_check have failed — admin hold points.
 */
export function useHoldPointJobs() {
  return useQuery({
    queryKey: ['pipeline-hold-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_steps')
        .select(`
          *,
          drone_jobs:mission_id(
            id, job_number, property_address, status,
            customers(name)
          )
        `)
        .in('step_name', ['qa_gate', 'coverage_check'])
        .eq('status', 'failed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });
}

// ─── Realtime ──────────────────────────────────────────────────────

/**
 * Subscribe to processing_steps and drone_jobs changes.
 * Invalidates relevant query caches on updates.
 */
export function usePipelineRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('pipeline-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processing_steps' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pipeline-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['mission-steps'] });
          queryClient.invalidateQueries({ queryKey: ['pipeline-hold-points'] });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drone_jobs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pipeline-jobs'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// ─── Mutations ─────────────────────────────────────────────────────

/**
 * Approve, exclude, or mark reshoot on a drone_asset from QA review.
 */
export function useQAOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      action,
    }: {
      assetId: string;
      action: 'approve' | 'exclude' | 'reshoot';
    }) => {
      const updates: Record<string, unknown> = {};

      if (action === 'approve') {
        updates.qa_status = 'passed';
        updates.pipeline_excluded = false;
      } else if (action === 'exclude') {
        updates.qa_status = 'failed';
        updates.pipeline_excluded = true;
      } else if (action === 'reshoot') {
        updates.qa_status = 'pending';
        updates.pipeline_excluded = false;
      }

      const { error } = await supabase
        .from('drone_assets')
        .update(updates)
        .eq('id', assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-hold-points'] });
    },
  });
}

/**
 * Resume the pipeline after admin review (QA or coverage hold).
 * Calls the n8n QA Resume webhook via a Supabase edge function or direct HTTP.
 */
export function useResumePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      missionId,
      holdType,
    }: {
      missionId: string;
      holdType: 'qa_review' | 'coverage_review';
    }) => {
      const { error } = await supabase.functions.invoke('pipeline-resume', {
        body: { mission_id: missionId, hold_type: holdType },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-hold-points'] });
      queryClient.invalidateQueries({ queryKey: ['mission-steps'] });
    },
  });
}

// ─── Processing Jobs (new table) ───────────────────────────────────

export interface ProcessingJobStep {
  name: string;
  script?: string;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'awaiting_manual_edit';
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  output?: string | null;
}

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

/**
 * Active processing_job for a specific mission.
 * Returns the most recent job that is not cancelled.
 */
export function useProcessingJob(missionId: string | undefined) {
  return useQuery({
    queryKey: ['processing-job', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('mission_id', missionId!)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ProcessingJob | null;
    },
    enabled: !!missionId,
    refetchInterval: 10_000,
  });
}

/**
 * All active processing_jobs (pending, running, awaiting_manual_edit).
 * Used by the Pipeline admin page.
 */
export function useActiveProcessingJobs() {
  return useQuery({
    queryKey: ['processing-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .in('status', ['pending', 'running', 'awaiting_manual_edit'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProcessingJob[];
    },
    refetchInterval: 10_000,
  });
}

/**
 * Trigger the pipeline for a mission via the pipeline-trigger edge function.
 */
export function useTriggerPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      missionId,
      processingTemplateId,
    }: {
      missionId: string;
      processingTemplateId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('pipeline-trigger', {
        body: { mission_id: missionId, processing_template_id: processingTemplateId },
      });

      if (error) {
        // Detect 409 conflict: pipeline already active for this mission today
        // Supabase FunctionsHttpError includes the response status via error.context
        const isConflict =
          (error as { context?: { status?: number } }).context?.status === 409 ||
          error.message?.includes('409');

        if (isConflict) {
          // Return a conflict sentinel instead of throwing
          // The calling component shows a specific warning toast for this case
          return { conflict: true, processing_job_id: null } as {
            conflict: true;
            processing_job_id: null;
          };
        }
        throw error;
      }

      return data as { processing_job_id: string };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['processing-job', variables.missionId] });
      queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
    },
  });
}

/**
 * Resume pipeline after V5 manual edit step.
 * Calls pipeline-manual-edit-complete edge function.
 */
export function useResumeManualEdit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      processingJobId,
      stepName,
      notes,
    }: {
      processingJobId: string;
      stepName: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('pipeline-manual-edit-complete', {
        body: {
          processing_job_id: processingJobId,
          step_name: stepName,
          ...(notes ? { notes } : {}),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['processing-job'] });
    },
  });
}
