import { useMemo } from 'react';
import { usePilotMissions } from './usePilotMissions';

export function useMapMissions(statusFilter: string[] | null = null) {
  const { data: missions = [], isLoading } = usePilotMissions();

  const filtered = useMemo(() => {
    let result = missions.filter(
      (m: any) => m.latitude != null && m.longitude != null
    );

    if (statusFilter && statusFilter.length > 0) {
      result = result.filter((m: any) => statusFilter.includes(m.status));
    }

    return result;
  }, [missions, statusFilter]);

  return { missions: filtered, isLoading };
}
