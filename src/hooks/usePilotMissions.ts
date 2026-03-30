import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PilotMission {
  id: string;
  job_number: string;
  client_name: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  pilot_notes: string | null;
  package_id: string | null;
  package_name: string | null;
  package_code: string | null;
  shot_manifest: any[] | null;
  requires_thermal: boolean;
  requires_raw: boolean;
  latitude: number | null;
  longitude: number | null;
  nearest_weather_station: string | null;
}

/**
 * Fetch all missions for the current pilot (dashboard list).
 * Uses offlineFirst network mode for cached data when offline.
 */
export function usePilotMissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pilot-missions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_jobs')
        .select('id, job_number, customers(name), property_address, property_city, property_state, latitude, longitude, scheduled_date, status, is_test, drone_packages(id, name, code, shot_manifest, requires_thermal, requires_raw)')
        .eq('pilot_id', user!.id)
        .eq('is_test', false)
        .neq('status', 'canceled')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((job: any) => ({
        id: job.id,
        job_number: job.job_number,
        client_name: job.customers?.name || 'Unknown Client',
        property_address: job.property_address,
        property_city: job.property_city || null,
        property_state: job.property_state || null,
        latitude: job.latitude ?? null,
        longitude: job.longitude ?? null,
        scheduled_date: job.scheduled_date,
        status: job.status,
        package_name: job.drone_packages?.name || null,
        package_code: job.drone_packages?.code || null,
        package_id: job.drone_packages?.id || null,
        shot_manifest: job.drone_packages?.shot_manifest || null,
        requires_thermal: job.drone_packages?.requires_thermal ?? false,
        requires_raw: job.drone_packages?.requires_raw ?? false,
      }));
    },
    enabled: !!user?.id,
    networkMode: 'offlineFirst',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single mission by ID with full details.
 */
export function usePilotMission(missionId: string | undefined) {
  return useQuery({
    queryKey: ['pilot-mission', missionId],
    queryFn: async (): Promise<PilotMission> => {
      const { data, error } = await supabase
        .from('drone_jobs')
        .select('*, customers(name), drone_packages(id, name, code, shot_manifest, requires_thermal, requires_raw)')
        .eq('id', missionId!)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        job_number: data.job_number,
        client_name: data.is_test ? 'Portfolio Flight' : (data.customers?.name || 'Unknown Client'),
        property_address: data.property_address,
        property_city: data.property_city,
        property_state: data.property_state,
        property_zip: data.property_zip,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        status: data.status,
        pilot_notes: data.pilot_notes,
        package_id: data.drone_packages?.id || null,
        package_name: data.drone_packages?.name || null,
        package_code: data.drone_packages?.code || null,
        shot_manifest: data.drone_packages?.shot_manifest || null,
        requires_thermal: data.drone_packages?.requires_thermal ?? false,
        requires_raw: data.drone_packages?.requires_raw ?? false,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        nearest_weather_station: data.nearest_weather_station ?? null,
      };
    },
    enabled: !!missionId,
    networkMode: 'offlineFirst',
    staleTime: 2 * 60 * 1000,
  });
}
