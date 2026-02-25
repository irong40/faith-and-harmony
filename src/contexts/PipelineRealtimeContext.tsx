import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * PipelineRealtimeContext
 *
 * Manages a single Supabase Realtime channel for processing_jobs table changes.
 * Lives at the app level so there is never more than one channel open.
 *
 * Critical safeguards (P5 — channel leak prevention):
 *   - Cleanup on unmount via removeChannel()
 *   - Pauses subscription when tab is hidden for > 30 seconds
 *   - Resumes subscription when tab becomes visible again
 */

interface PipelineRealtimeContextValue {
  isSubscribed: boolean;
}

const PipelineRealtimeContext = createContext<PipelineRealtimeContextValue>({
  isSubscribed: false,
});

export function usePipelineRealtime() {
  return useContext(PipelineRealtimeContext);
}

const HIDDEN_PAUSE_DELAY_MS = 30_000;

export function PipelineRealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hiddenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  function subscribe() {
    if (channelRef.current) return; // Already subscribed

    const channel = supabase
      .channel('processing-jobs-realtime', {
        config: { presence: { key: 'pipeline' } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'processing_jobs',
        },
        (payload) => {
          const missionId = (payload.new as Record<string, string>).mission_id;
          queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
          if (missionId) {
            queryClient.invalidateQueries({ queryKey: ['processing-job', missionId] });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'processing_jobs',
        },
        (payload) => {
          const missionId = (payload.new as Record<string, string>).mission_id;
          queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
          if (missionId) {
            queryClient.invalidateQueries({ queryKey: ['processing-job', missionId] });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'n8n_heartbeat',
        },
        () => {
          window.dispatchEvent(new CustomEvent('n8n-heartbeat-update'));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'n8n_heartbeat',
        },
        () => {
          window.dispatchEvent(new CustomEvent('n8n-heartbeat-update'));
        },
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }

  function unsubscribe() {
    if (!channelRef.current) return;
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    setIsSubscribed(false);
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      // Start countdown to unsubscribe if tab stays hidden
      hiddenTimerRef.current = setTimeout(() => {
        unsubscribe();
      }, HIDDEN_PAUSE_DELAY_MS);
    } else {
      // Tab became visible — cancel any pending unsubscribe and resubscribe
      if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = null;
      }
      subscribe();
    }
  }

  useEffect(() => {
    subscribe();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
      }
      // Guaranteed cleanup on unmount
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PipelineRealtimeContext.Provider value={{ isSubscribed }}>
      {children}
    </PipelineRealtimeContext.Provider>
  );
}
