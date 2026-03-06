import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ProcessingJob,
  ProcessingJobStep,
  ProcessingTemplate,
  DeliveryLog,
  PipelineJobRow,
} from '@/types/pipeline';

// Re-export types that components import from here
export type { ProcessingJob, ProcessingJobStep, PipelineJobRow };

// ─── Queries ───────────────────────────────────────────────────────

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
 * Processing template by ID. Used when the job already has a template assigned
 * (covers standalone paths C, D, V, B+C that have no package_id).
 */
export function useProcessingTemplateById(templateId: string | undefined) {
  return useQuery({
    queryKey: ['processing-template-by-id', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_templates')
        .select('*')
        .eq('id', templateId!)
        .single();

      if (error) throw error;
      return data as ProcessingTemplate;
    },
    enabled: !!templateId,
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

// ─── Processing Jobs (Model 2 — single source of truth) ────────────

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
 * All active processing_jobs (pending, running, awaiting_manual_edit)
 * with joined drone_jobs data for the Pipeline admin page.
 */
export function useActiveProcessingJobs() {
  return useQuery({
    queryKey: ['processing-jobs-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select(`
          *,
          drone_jobs:mission_id(
            id, job_number, property_address, status,
            customers(name, email),
            drone_packages(name, code)
          )
        `)
        .in('status', ['pending', 'running', 'awaiting_manual_edit'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PipelineJobRow[];
    },
    refetchInterval: 10_000,
  });
}

/**
 * Completed/failed/cancelled processing_jobs with joined drone_jobs data.
 * Used by the Pipeline History tab.
 */
export function useCompletedProcessingJobs() {
  return useQuery({
    queryKey: ['processing-jobs-completed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select(`
          *,
          drone_jobs:mission_id(
            id, job_number, property_address, status,
            customers(name, email),
            drone_packages(name, code)
          )
        `)
        .in('status', ['complete', 'failed', 'cancelled'])
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PipelineJobRow[];
    },
    refetchInterval: 30_000,
  });
}

/**
 * Processing jobs awaiting manual edit — admin hold points.
 */
export function useHoldPointJobs() {
  return useQuery({
    queryKey: ['processing-jobs-hold'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select(`
          *,
          drone_jobs:mission_id(
            id, job_number, property_address, status,
            customers(name, email),
            drone_packages(name, code)
          )
        `)
        .eq('status', 'awaiting_manual_edit')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PipelineJobRow[];
    },
    refetchInterval: 10_000,
  });
}

// ─── Realtime ──────────────────────────────────────────────────────

/**
 * Subscribe to processing_jobs changes.
 * Invalidates all pipeline query caches on updates.
 */
export function usePipelineRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('pipeline-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processing_jobs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['processing-jobs-active'] });
          queryClient.invalidateQueries({ queryKey: ['processing-jobs-completed'] });
          queryClient.invalidateQueries({ queryKey: ['processing-jobs-hold'] });
          queryClient.invalidateQueries({ queryKey: ['processing-job'] });
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
      queryClient.invalidateQueries({ queryKey: ['processing-jobs-active'] });
      queryClient.invalidateQueries({ queryKey: ['processing-jobs-hold'] });
    },
  });
}

/**
 * Resume the pipeline after admin review (QA or coverage hold).
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
      queryClient.invalidateQueries({ queryKey: ['processing-jobs-active'] });
      queryClient.invalidateQueries({ queryKey: ['processing-jobs-hold'] });
      queryClient.invalidateQueries({ queryKey: ['processing-job'] });
    },
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
        const isConflict =
          (error as { context?: { status?: number } }).context?.status === 409 ||
          error.message?.includes('409');

        if (isConflict) {
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
      queryClient.invalidateQueries({ queryKey: ['processing-jobs-active'] });
    },
  });
}

/**
 * Resume pipeline after manual edit step.
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
      queryClient.invalidateQueries({ queryKey: ['processing-jobs-active'] });
      queryClient.invalidateQueries({ queryKey: ['processing-jobs-hold'] });
      queryClient.invalidateQueries({ queryKey: ['processing-job'] });
    },
  });
}
