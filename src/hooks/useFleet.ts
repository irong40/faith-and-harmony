import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Aircraft, Battery, Controller, Accessory, AircraftCapability } from '@/types/fleet';

/**
 * Fetch all active aircraft.
 */
export function useActiveAircraft() {
  return useQuery({
    queryKey: ['fleet-aircraft-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aircraft')
        .select('*')
        .eq('status', 'active')
        .order('model', { ascending: true });

      if (error) throw error;
      return data as Aircraft[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch all aircraft (any status) for fleet overview.
 */
export function useAllAircraft() {
  return useQuery({
    queryKey: ['fleet-aircraft-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aircraft')
        .select('*')
        .order('status', { ascending: true })
        .order('model', { ascending: true });

      if (error) throw error;
      return data as Aircraft[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch active batteries, optionally filtered by aircraft.
 */
export function useActiveBatteries(aircraftId?: string | null) {
  return useQuery({
    queryKey: ['fleet-batteries-active', aircraftId],
    queryFn: async () => {
      let query = supabase
        .from('batteries')
        .select('*')
        .eq('status', 'active')
        .order('serial_number', { ascending: true });

      if (aircraftId) {
        // Show batteries assigned to this aircraft OR unassigned
        query = query.or(`aircraft_id.eq.${aircraftId},aircraft_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Battery[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch all batteries for fleet overview.
 */
export function useAllBatteries() {
  return useQuery({
    queryKey: ['fleet-batteries-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batteries')
        .select('*')
        .order('serial_number', { ascending: true });

      if (error) throw error;
      return data as Battery[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch active controllers.
 */
export function useActiveControllers() {
  return useQuery({
    queryKey: ['fleet-controllers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controllers')
        .select('*')
        .eq('status', 'active')
        .order('model', { ascending: true });

      if (error) throw error;
      return data as Controller[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch all controllers for fleet overview.
 */
export function useAllControllers() {
  return useQuery({
    queryKey: ['fleet-controllers-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controllers')
        .select('*')
        .order('model', { ascending: true });

      if (error) throw error;
      return data as Controller[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch all accessories for fleet overview.
 */
export function useAllAccessories() {
  return useQuery({
    queryKey: ['fleet-accessories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accessories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Accessory[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch aircraft capabilities for a given package.
 * Returns the aircraft IDs capable of flying this package type.
 */
export function useAircraftCapabilities(packageId: string | null) {
  return useQuery({
    queryKey: ['aircraft-capabilities', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aircraft_capabilities')
        .select('*')
        .eq('package_id', packageId!);

      if (error) throw error;
      return data as AircraftCapability[];
    },
    enabled: !!packageId,
    staleTime: 30 * 60 * 1000,
  });
}
