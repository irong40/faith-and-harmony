// Weather briefing types for Trestle v2.0

export type WeatherDetermination = 'GO' | 'CAUTION' | 'NO_GO';

export interface WeatherThreshold {
  id: string;
  label: string;
  aircraft_model: string | null;
  package_type: string | null;
  is_part_107_minimum: boolean;
  max_wind_speed_ms: number | null;
  min_visibility_sm: number | null;
  min_cloud_ceiling_ft: number | null;
  min_temp_c: number | null;
  max_temp_c: number | null;
  max_precip_probability: number | null;
  max_kp_index: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MissionWeatherLog {
  id: string;
  mission_id: string;
  metar_station: string | null;
  metar_raw: string | null;
  briefing_timestamp: string;
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
  determination_reasons: string[] | null;
  pilot_override: boolean;
  override_reason: string | null;
  override_approved_by: string | null;
  created_at: string;
}

export interface WeatherBriefingResult {
  determination: WeatherDetermination;
  reasons: string[];
  metrics: {
    wind_speed_ms: number | null;
    wind_gust_ms: number | null;
    visibility_sm: number | null;
    cloud_ceiling_ft: number | null;
    temperature_c: number | null;
    dewpoint_c: number | null;
    altimeter_inhg: number | null;
  };
  metar_raw: string | null;
  station: string;
  timestamp: string;
}
