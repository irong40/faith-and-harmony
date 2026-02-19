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
