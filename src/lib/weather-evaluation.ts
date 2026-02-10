import type { WeatherThreshold, WeatherDetermination } from '@/types/weather';

interface WeatherMetrics {
  wind_speed_ms: number | null;
  wind_gust_ms: number | null;
  visibility_sm: number | null;
  cloud_ceiling_ft: number | null;
  temperature_c: number | null;
  precipitation_probability: number | null;
  kp_index: number | null;
}

interface EvaluationResult {
  determination: WeatherDetermination;
  reasons: string[];
}

/**
 * Evaluate weather conditions against a set of thresholds.
 * Returns GO, CAUTION, or NO_GO with reasons.
 *
 * Logic: any single NO_GO reason → NO_GO. Any CAUTION reason → CAUTION. Otherwise GO.
 * CAUTION triggers at 80% of the NO_GO threshold.
 */
export function evaluateWeather(
  metrics: WeatherMetrics,
  thresholds: WeatherThreshold[]
): EvaluationResult {
  const reasons: string[] = [];
  let worst: WeatherDetermination = 'GO';

  const escalate = (level: WeatherDetermination, reason: string) => {
    reasons.push(reason);
    if (level === 'NO_GO') worst = 'NO_GO';
    else if (level === 'CAUTION' && worst !== 'NO_GO') worst = 'CAUTION';
  };

  for (const t of thresholds) {
    // Wind speed
    if (t.max_wind_speed_ms != null && metrics.wind_speed_ms != null) {
      if (metrics.wind_speed_ms > t.max_wind_speed_ms) {
        escalate('NO_GO', `Wind ${metrics.wind_speed_ms.toFixed(1)} m/s exceeds ${t.label} max ${t.max_wind_speed_ms} m/s`);
      } else if (metrics.wind_speed_ms > t.max_wind_speed_ms * 0.8) {
        escalate('CAUTION', `Wind ${metrics.wind_speed_ms.toFixed(1)} m/s approaching ${t.label} max ${t.max_wind_speed_ms} m/s`);
      }
    }

    // Wind gust (check against same wind threshold with 1.2x multiplier)
    if (t.max_wind_speed_ms != null && metrics.wind_gust_ms != null) {
      if (metrics.wind_gust_ms > t.max_wind_speed_ms * 1.2) {
        escalate('NO_GO', `Gusts ${metrics.wind_gust_ms.toFixed(1)} m/s exceed safe limit for ${t.label}`);
      } else if (metrics.wind_gust_ms > t.max_wind_speed_ms) {
        escalate('CAUTION', `Gusts ${metrics.wind_gust_ms.toFixed(1)} m/s above ${t.label} wind limit`);
      }
    }

    // Visibility
    if (t.min_visibility_sm != null && metrics.visibility_sm != null) {
      if (metrics.visibility_sm < t.min_visibility_sm) {
        escalate('NO_GO', `Visibility ${metrics.visibility_sm} SM below ${t.label} min ${t.min_visibility_sm} SM`);
      } else if (metrics.visibility_sm < t.min_visibility_sm * 1.25) {
        escalate('CAUTION', `Visibility ${metrics.visibility_sm} SM near ${t.label} min ${t.min_visibility_sm} SM`);
      }
    }

    // Cloud ceiling
    if (t.min_cloud_ceiling_ft != null && metrics.cloud_ceiling_ft != null) {
      if (metrics.cloud_ceiling_ft < t.min_cloud_ceiling_ft) {
        escalate('NO_GO', `Ceiling ${metrics.cloud_ceiling_ft} ft below ${t.label} min ${t.min_cloud_ceiling_ft} ft`);
      } else if (metrics.cloud_ceiling_ft < t.min_cloud_ceiling_ft * 1.25) {
        escalate('CAUTION', `Ceiling ${metrics.cloud_ceiling_ft} ft near ${t.label} min ${t.min_cloud_ceiling_ft} ft`);
      }
    }

    // Temperature range
    if (t.min_temp_c != null && metrics.temperature_c != null) {
      if (metrics.temperature_c < t.min_temp_c) {
        escalate('NO_GO', `Temperature ${metrics.temperature_c}°C below ${t.label} min ${t.min_temp_c}°C`);
      }
    }
    if (t.max_temp_c != null && metrics.temperature_c != null) {
      if (metrics.temperature_c > t.max_temp_c) {
        escalate('NO_GO', `Temperature ${metrics.temperature_c}°C above ${t.label} max ${t.max_temp_c}°C`);
      } else if (metrics.temperature_c > t.max_temp_c * 0.9) {
        escalate('CAUTION', `Temperature ${metrics.temperature_c}°C approaching ${t.label} max ${t.max_temp_c}°C`);
      }
    }

    // Precipitation
    if (t.max_precip_probability != null && metrics.precipitation_probability != null) {
      if (metrics.precipitation_probability > t.max_precip_probability) {
        escalate('NO_GO', `Precip probability ${metrics.precipitation_probability}% exceeds ${t.label} max ${t.max_precip_probability}%`);
      }
    }

    // KP index (geomagnetic activity)
    if (t.max_kp_index != null && metrics.kp_index != null) {
      if (metrics.kp_index > t.max_kp_index) {
        escalate('CAUTION', `KP index ${metrics.kp_index} above ${t.label} max ${t.max_kp_index}`);
      }
    }
  }

  if (reasons.length === 0) {
    reasons.push('All conditions within acceptable limits');
  }

  return { determination: worst, reasons };
}
