import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MissionEquipment } from '@/types/fleet';

/**
 * Fetch equipment selection for a mission (1:1 with mission).
 */
export function useMissionEquipment(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-equipment', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_equipment')
        .select('*')
        .eq('mission_id', missionId!)
        .maybeSingle();

      if (error) throw error;
      return data as MissionEquipment | null;
    },
    enabled: !!missionId,
    networkMode: 'offlineFirst',
  });
}

interface UpsertEquipmentInput {
  mission_id: string;
  aircraft_id: string;
  battery_ids: string[];
  controller_id: string | null;
  notes?: string | null;
}

/**
 * Upsert mission equipment (insert or update).
 * Deletes existing record first to avoid unique constraint issues,
 * then inserts new record.
 */
export function useUpsertMissionEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertEquipmentInput) => {
      // Delete any existing record for this mission
      await supabase
        .from('mission_equipment')
        .delete()
        .eq('mission_id', input.mission_id);

      // Insert fresh
      const { data, error } = await supabase
        .from('mission_equipment')
        .insert({
          mission_id: input.mission_id,
          aircraft_id: input.aircraft_id,
          battery_ids: input.battery_ids,
          controller_id: input.controller_id,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MissionEquipment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mission-equipment', variables.mission_id] });
    },
  });
}
