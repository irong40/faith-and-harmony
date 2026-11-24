// Aircraft maintenance history (Adam decision 2026-11-22 #0). Reads and writes
// the EXISTING public.maintenance_log table, keyed to aircraft.id through the
// aircraft_id column added in migration 20261124130000. No second fleet list.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Aircraft, MaintenanceLogEntry } from '@/types/fleet';
import type { MaintenanceInsertPayload } from '@/lib/maintenanceRecord';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The id comes from the URL and is put into a PostgREST filter: only a UUID passes. */
export function isAircraftId(id: string | undefined): id is string {
  return !!id && UUID_RE.test(id);
}

export function useAircraftRecord(aircraftId: string | undefined) {
  return useQuery({
    queryKey: ['aircraft', aircraftId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aircraft')
        .select('*')
        .eq('id', aircraftId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as Aircraft | null) ?? null;
    },
    enabled: isAircraftId(aircraftId),
  });
}

/**
 * Dated history for one aircraft, newest first. TEST rows (is_test = true,
 * made only in dev/staging) are excluded so they never show in a live record.
 */
export function useAircraftMaintenanceHistory(aircraftId: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-log', 'aircraft-history', aircraftId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_log')
        .select('*')
        // Rows from this form carry aircraft_id; rows from the older Fleet
        // "Log Maintenance" dialog only carry equipment_type/equipment_id.
        .or(`aircraft_id.eq.${aircraftId},and(equipment_type.eq.aircraft,equipment_id.eq.${aircraftId})`)
        .eq('is_test', false)
        .order('performed_at', { ascending: false })
        // Same-day entries tie on performed_at (the form stamps 12:00Z); the later save is newer.
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as MaintenanceLogEntry[];
    },
    enabled: isAircraftId(aircraftId),
  });
}

/** Insert one record built by buildMaintenancePayload. Online only: a dated
 * maintenance record should not sit in an offline queue unseen. */
export function useCreateAircraftMaintenanceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MaintenanceInsertPayload) => {
      const { data, error } = await supabase
        .from('maintenance_log')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as MaintenanceLogEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-log'] });
    },
  });
}
