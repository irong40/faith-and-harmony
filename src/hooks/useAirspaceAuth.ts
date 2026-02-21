import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addToSyncQueue } from '@/lib/sync/db';
import { haversineDistanceNm } from '@/lib/geo-utils';
import type { AirspaceGrid, TfrCache, MissionAuthorization, TfrSummary } from '@/types/authorization';
import type { Json } from '@/integrations/supabase/types';

/**
 * Fetch all airspace grids and find the nearest to given coordinates.
 * Returns the closest grid within 15 NM, or null.
 */
export function useNearestAirspace(latitude: number | null, longitude: number | null) {
  return useQuery({
    queryKey: ['nearest-airspace', latitude, longitude],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airspace_grids')
        .select('*');

      if (error) throw error;

      const grids = data as AirspaceGrid[];
      if (!grids.length || latitude == null || longitude == null) return null;

      let nearest: AirspaceGrid | null = null;
      let minDist = Infinity;

      for (const grid of grids) {
        if (grid.latitude == null || grid.longitude == null) continue;
        const dist = haversineDistanceNm(latitude, longitude, grid.latitude, grid.longitude);
        if (dist < minDist) {
          minDist = dist;
          nearest = grid;
        }
      }

      // Only return if within 15 NM
      if (minDist > 15) return null;

      return { grid: nearest!, distance_nm: Math.round(minDist * 10) / 10 };
    },
    enabled: latitude != null && longitude != null,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch active TFRs near given coordinates (within 30 NM).
 */
export function useActiveTfrs(latitude: number | null, longitude: number | null) {
  return useQuery({
    queryKey: ['active-tfrs', latitude, longitude],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tfr_cache')
        .select('*')
        .in('status', ['active', 'scheduled']);

      if (error) throw error;

      const tfrs = data as TfrCache[];
      if (!tfrs.length || latitude == null || longitude == null) return [];

      // Filter by proximity (30 NM)
      return tfrs
        .filter(tfr => {
          if (tfr.center_latitude == null || tfr.center_longitude == null) return false;
          const dist = haversineDistanceNm(latitude, longitude, tfr.center_latitude, tfr.center_longitude);
          return dist < 30;
        })
        .map(tfr => ({
          ...tfr,
          distance_nm: haversineDistanceNm(
            latitude!,
            longitude!,
            tfr.center_latitude!,
            tfr.center_longitude!
          ),
        }))
        .sort((a, b) => a.distance_nm - b.distance_nm);
    },
    enabled: latitude != null && longitude != null,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch existing authorization for a mission.
 */
export function useMissionAuthorization(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-authorization', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_authorizations')
        .select('*')
        .eq('mission_id', missionId!)
        .maybeSingle();

      if (error) throw error;
      return data as MissionAuthorization | null;
    },
    enabled: !!missionId,
    networkMode: 'offlineFirst',
  });
}

interface SaveAuthorizationInput {
  mission_id: string;
  airspace_class: string;
  requires_laanc: boolean;
  is_zero_grid: boolean;
  max_approved_altitude_ft: number | null;
  active_tfrs: TfrSummary[];
  determination_notes: string | null;
}

/**
 * Save airspace authorization for a mission (upsert).
 */
export function useSaveMissionAuthorization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveAuthorizationInput) => {
      const record = {
        mission_id: input.mission_id,
        airspace_class: input.airspace_class,
        requires_laanc: input.requires_laanc,
        is_zero_grid: input.is_zero_grid,
        max_approved_altitude_ft: input.max_approved_altitude_ft,
        active_tfrs: input.active_tfrs as unknown as Json,
        determination_notes: input.determination_notes,
      };

      if (!navigator.onLine) {
        await addToSyncQueue({
          action: 'save_authorization',
          table: 'mission_authorizations',
          payload: record as unknown as Record<string, unknown>,
          created_at: new Date().toISOString(),
          retries: 0,
          last_error: null,
        });
        return { ...record, id: `offline-${Date.now()}` } as unknown as MissionAuthorization;
      }

      // Delete existing
      await supabase
        .from('mission_authorizations')
        .delete()
        .eq('mission_id', input.mission_id);

      const { data, error } = await supabase
        .from('mission_authorizations')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data as MissionAuthorization;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mission-authorization', variables.mission_id] });
    },
  });
}
