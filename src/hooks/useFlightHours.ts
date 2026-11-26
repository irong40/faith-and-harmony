// Flight-hours readings (Adam decision 2026-11-22 #0, part 2). Reads and writes
// public.aircraft_flight_hours (migration 20261124150000). Flight activity is
// kept in its own table so it can never stand in for evidence of maintenance.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MaintenanceLogEntry } from '@/types/fleet';
import type { FlightHoursInsertPayload, FlightHoursReading } from '@/lib/maintenanceQuarterly';

/** Every live flight-hours reading, newest first. TEST rows are excluded. */
export function useFlightHoursReadings() {
  return useQuery({
    queryKey: ['aircraft-flight-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aircraft_flight_hours')
        .select('*')
        .eq('is_test', false)
        .order('as_of_date', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as FlightHoursReading[];
    },
  });
}

/** Aircraft maintenance rows across the fleet, for the quarterly view. */
export function useFleetMaintenanceLog() {
  return useQuery({
    queryKey: ['maintenance-log', 'fleet-quarterly'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_log')
        .select('*')
        .eq('is_test', false)
        .order('performed_at', { ascending: false })
        // Same-day entries tie on performed_at (the form stamps 12:00Z); the later save is newer.
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as MaintenanceLogEntry[];
    },
  });
}

/** Insert one reading built by buildFlightHoursPayload (manual or import). */
export function useCreateFlightHoursReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FlightHoursInsertPayload) => {
      const { data, error } = await supabase
        .from('aircraft_flight_hours')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as FlightHoursReading;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aircraft-flight-hours'] });
    },
  });
}
