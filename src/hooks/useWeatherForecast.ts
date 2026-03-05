import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WeatherDetermination } from '@/types/weather';

export type ForecastRow = {
  id: string;
  forecast_hour: string;
  wind_speed_ms: number | null;
  wind_gust_ms: number | null;
  visibility_sm: number | null;
  cloud_ceiling_ft: number | null;
  precipitation_probability: number | null;
  temperature_c: number | null;
  sky_cover_pct: number | null;
  determination: WeatherDetermination | null;
  determination_reasons: string[] | null;
  fetched_at: string | null;
};

/**
 * Fetch cached weather forecast for the next 48 hours.
 */
export function useWeatherForecast() {
  return useQuery({
    queryKey: ['weather-forecast'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('weather_forecast_cache' as never)
        .select('*')
        .gte('forecast_hour', now)
        .lte('forecast_hour', future)
        .order('forecast_hour', { ascending: true });

      if (error) throw error;
      return (data || []) as ForecastRow[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export type WeatherHeldJob = {
  id: string;
  job_number: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  weather_hold: boolean;
  weather_hold_reasons: string[] | null;
};

/**
 * Fetch drone jobs that are on weather hold and not yet delivered or cancelled.
 */
export function useWeatherHeldJobs() {
  return useQuery({
    queryKey: ['weather-held-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_jobs')
        .select('id, job_number, scheduled_date, scheduled_time, status, weather_hold, weather_hold_reasons')
        .eq('weather_hold', true)
        .not('status', 'in', '("delivered","cancelled")')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return (data || []) as WeatherHeldJob[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
