import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addToSyncQueue } from '@/lib/sync/db';
import type { WeatherThreshold, MissionWeatherLog, WeatherDetermination } from '@/types/weather';

/**
 * Fetch applicable weather thresholds.
 * Returns Part 107 minimums + aircraft-specific + package-specific thresholds.
 */
export function useWeatherThresholds(aircraftModel: string | null, packageCode: string | null) {
  return useQuery({
    queryKey: ['weather-thresholds', aircraftModel, packageCode],
    queryFn: async () => {
      // Always include Part 107 minimums
      let query = supabase
        .from('weather_thresholds')
        .select('*');

      // Build OR filter: Part 107 minimums, aircraft match, package match
      const filters: string[] = ['is_part_107_minimum.eq.true'];
      if (aircraftModel) filters.push(`aircraft_model.eq.${aircraftModel}`);
      if (packageCode) filters.push(`package_type.eq.${packageCode}`);

      query = query.or(filters.join(','));

      const { data, error } = await query;
      if (error) throw error;
      return data as WeatherThreshold[];
    },
    enabled: true, // Always fetch at least Part 107 minimums
    staleTime: 60 * 60 * 1000, // 1 hour — thresholds rarely change
  });
}

/**
 * Fetch existing weather log for a mission.
 */
export function useMissionWeatherLog(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-weather-log', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mission_weather_logs')
        .select('*')
        .eq('mission_id', missionId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MissionWeatherLog | null;
    },
    enabled: !!missionId,
    networkMode: 'offlineFirst',
  });
}

interface CreateWeatherBriefingInput {
  mission_id: string;
  metar_station: string | null;
  metar_raw: string | null;
  wind_speed_ms: number | null;
  wind_gust_ms: number | null;
  wind_direction_deg: number | null;
  visibility_sm: number | null;
  cloud_ceiling_ft: number | null;
  temperature_c: number | null;
  dewpoint_c: number | null;
  altimeter_inhg: number | null;
  precipitation_probability: number | null;
  kp_index: number | null;
  determination: WeatherDetermination;
  determination_reasons: string[];
  pilot_override?: boolean;
  override_reason?: string | null;
}

/**
 * Create a new weather briefing record.
 */
export function useCreateWeatherBriefing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWeatherBriefingInput) => {
      const record = {
        mission_id: input.mission_id,
        metar_station: input.metar_station,
        metar_raw: input.metar_raw,
        briefing_timestamp: new Date().toISOString(),
        wind_speed_ms: input.wind_speed_ms,
        wind_gust_ms: input.wind_gust_ms,
        wind_direction_deg: input.wind_direction_deg,
        visibility_sm: input.visibility_sm,
        cloud_ceiling_ft: input.cloud_ceiling_ft,
        temperature_c: input.temperature_c,
        dewpoint_c: input.dewpoint_c,
        altimeter_inhg: input.altimeter_inhg,
        precipitation_probability: input.precipitation_probability,
        kp_index: input.kp_index,
        determination: input.determination,
        determination_reasons: input.determination_reasons,
        pilot_override: input.pilot_override || false,
        override_reason: input.override_reason || null,
      };

      if (!navigator.onLine) {
        await addToSyncQueue({
          action: 'insert_weather_briefing',
          table: 'mission_weather_logs',
          payload: record,
          created_at: new Date().toISOString(),
          retries: 0,
          last_error: null,
        });
        return { ...record, id: `offline-${Date.now()}` } as unknown as MissionWeatherLog;
      }

      const { data, error } = await supabase
        .from('mission_weather_logs')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data as MissionWeatherLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mission-weather-log', variables.mission_id] });
    },
  });
}
