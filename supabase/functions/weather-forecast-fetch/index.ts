import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// NWS gridpoint for Hampton Roads (Wakefield VA forecast office)
const NWS_GRIDPOINT_URL = "https://api.weather.gov/gridpoints/AKQ/90,52";
const NWS_USER_AGENT = "SentinelAerial/1.0 admin@faithandharmonyllc.com";

// Number of forecast hours to process
const FORECAST_HOURS = 48;

// ---------------------------------------------------------------------------
// Types (inlined for Deno, mirrors src/types/weather.ts)
// ---------------------------------------------------------------------------

type WeatherDetermination = "GO" | "CAUTION" | "NO_GO";

interface WeatherThreshold {
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
}

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

// ---------------------------------------------------------------------------
// evaluateWeatherInline (ported verbatim from src/lib/weather-evaluation.ts)
// ---------------------------------------------------------------------------

function evaluateWeatherInline(
  metrics: WeatherMetrics,
  thresholds: WeatherThreshold[]
): EvaluationResult {
  const reasons: string[] = [];
  let worst: WeatherDetermination = "GO";

  const escalate = (level: WeatherDetermination, reason: string) => {
    reasons.push(reason);
    if (level === "NO_GO") worst = "NO_GO";
    else if (level === "CAUTION" && worst !== "NO_GO") worst = "CAUTION";
  };

  for (const t of thresholds) {
    // Wind speed
    if (t.max_wind_speed_ms != null && metrics.wind_speed_ms != null) {
      if (metrics.wind_speed_ms > t.max_wind_speed_ms) {
        escalate("NO_GO", `Wind ${metrics.wind_speed_ms.toFixed(1)} m/s exceeds ${t.label} max ${t.max_wind_speed_ms} m/s`);
      } else if (metrics.wind_speed_ms > t.max_wind_speed_ms * 0.8) {
        escalate("CAUTION", `Wind ${metrics.wind_speed_ms.toFixed(1)} m/s approaching ${t.label} max ${t.max_wind_speed_ms} m/s`);
      }
    }

    // Wind gust (check against same wind threshold with 1.2x multiplier)
    if (t.max_wind_speed_ms != null && metrics.wind_gust_ms != null) {
      if (metrics.wind_gust_ms > t.max_wind_speed_ms * 1.2) {
        escalate("NO_GO", `Gusts ${metrics.wind_gust_ms.toFixed(1)} m/s exceed safe limit for ${t.label}`);
      } else if (metrics.wind_gust_ms > t.max_wind_speed_ms) {
        escalate("CAUTION", `Gusts ${metrics.wind_gust_ms.toFixed(1)} m/s above ${t.label} wind limit`);
      }
    }

    // Visibility
    if (t.min_visibility_sm != null && metrics.visibility_sm != null) {
      if (metrics.visibility_sm < t.min_visibility_sm) {
        escalate("NO_GO", `Visibility ${metrics.visibility_sm} SM below ${t.label} min ${t.min_visibility_sm} SM`);
      } else if (metrics.visibility_sm < t.min_visibility_sm * 1.25) {
        escalate("CAUTION", `Visibility ${metrics.visibility_sm} SM near ${t.label} min ${t.min_visibility_sm} SM`);
      }
    }

    // Cloud ceiling
    if (t.min_cloud_ceiling_ft != null && metrics.cloud_ceiling_ft != null) {
      if (metrics.cloud_ceiling_ft < t.min_cloud_ceiling_ft) {
        escalate("NO_GO", `Ceiling ${metrics.cloud_ceiling_ft} ft below ${t.label} min ${t.min_cloud_ceiling_ft} ft`);
      } else if (metrics.cloud_ceiling_ft < t.min_cloud_ceiling_ft * 1.25) {
        escalate("CAUTION", `Ceiling ${metrics.cloud_ceiling_ft} ft near ${t.label} min ${t.min_cloud_ceiling_ft} ft`);
      }
    }

    // Temperature range
    if (t.min_temp_c != null && metrics.temperature_c != null) {
      if (metrics.temperature_c < t.min_temp_c) {
        escalate("NO_GO", `Temperature ${metrics.temperature_c}\u00B0C below ${t.label} min ${t.min_temp_c}\u00B0C`);
      }
    }
    if (t.max_temp_c != null && metrics.temperature_c != null) {
      if (metrics.temperature_c > t.max_temp_c) {
        escalate("NO_GO", `Temperature ${metrics.temperature_c}\u00B0C above ${t.label} max ${t.max_temp_c}\u00B0C`);
      } else if (metrics.temperature_c > t.max_temp_c * 0.9) {
        escalate("CAUTION", `Temperature ${metrics.temperature_c}\u00B0C approaching ${t.label} max ${t.max_temp_c}\u00B0C`);
      }
    }

    // Precipitation
    if (t.max_precip_probability != null && metrics.precipitation_probability != null) {
      if (metrics.precipitation_probability > t.max_precip_probability) {
        escalate("NO_GO", `Precip probability ${metrics.precipitation_probability}% exceeds ${t.label} max ${t.max_precip_probability}%`);
      }
    }

    // KP index (geomagnetic activity)
    if (t.max_kp_index != null && metrics.kp_index != null) {
      if (metrics.kp_index > t.max_kp_index) {
        escalate("CAUTION", `KP index ${metrics.kp_index} above ${t.label} max ${t.max_kp_index}`);
      }
    }
  }

  if (reasons.length === 0) {
    reasons.push("All conditions within acceptable limits");
  }

  return { determination: worst, reasons };
}

// ---------------------------------------------------------------------------
// NWS data parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse ISO 8601 duration (e.g. "PT3H", "P1DT2H") into integer hours.
 */
function parseDurationHours(iso: string): number {
  const match = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?/);
  if (!match) return 1;
  const days = match[1] ? parseInt(match[1], 10) : 0;
  const hours = match[2] ? parseInt(match[2], 10) : 0;
  return days * 24 + hours || 1;
}

interface NwsTimeValue {
  validTime: string; // "2026-03-05T14:00:00+00:00/PT3H"
  value: number | null;
}

/**
 * Expand NWS compressed time series into one value per hour for
 * FORECAST_HOURS hours starting from startHour.
 *
 * NWS validTime format: "ISO_TIMESTAMP/ISO_DURATION"
 * Each entry covers durationHours hours starting at the timestamp.
 * Loop uses h in [0, durationHours) (exclusive endpoint per research pitfall 3).
 */
function expandToHourly(
  series: NwsTimeValue[],
  startHour: Date
): (number | null)[] {
  const result: (number | null)[] = new Array(FORECAST_HOURS).fill(null);
  const startMs = startHour.getTime();

  for (const entry of series) {
    const parts = entry.validTime.split("/");
    if (parts.length !== 2) continue;

    const entryStart = new Date(parts[0]);
    const durationHours = parseDurationHours(parts[1]);

    for (let h = 0; h < durationHours; h++) {
      const hourMs = entryStart.getTime() + h * 3600000;
      const index = Math.round((hourMs - startMs) / 3600000);
      if (index >= 0 && index < FORECAST_HOURS) {
        result[index] = entry.value;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const fetchedAt = new Date().toISOString();

  try {
    // -----------------------------------------------------------------
    // 1. FETCH NWS DATA
    // -----------------------------------------------------------------
    const nwsResponse = await fetch(NWS_GRIDPOINT_URL, {
      headers: {
        "User-Agent": NWS_USER_AGENT,
        Accept: "application/geo+json",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!nwsResponse.ok) {
      throw new Error(`NWS returned HTTP ${nwsResponse.status}`);
    }

    const nwsData = await nwsResponse.json();
    const props = nwsData.properties;

    if (!props) {
      throw new Error("NWS response missing properties");
    }

    // -----------------------------------------------------------------
    // 2. EXPAND AND CONVERT
    // -----------------------------------------------------------------
    // Start from current hour (rounded down)
    const now = new Date();
    const startHour = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours()
      )
    );

    // Expand each time series to hourly values
    const windSpeedKmh = expandToHourly(props.windSpeed?.values || [], startHour);
    const windGustKmh = expandToHourly(props.windGust?.values || [], startHour);
    const visibilityM = expandToHourly(props.visibility?.values || [], startHour);
    const ceilingM = expandToHourly(props.ceilingHeight?.values || [], startHour);
    const precipProb = expandToHourly(props.probabilityOfPrecipitation?.values || [], startHour);
    const skyCover = expandToHourly(props.skyCover?.values || [], startHour);
    const tempC = expandToHourly(props.temperature?.values || [], startHour);

    // Convert units at build time
    const windSpeedMs = windSpeedKmh.map((v) => (v != null ? v / 3.6 : null));
    const windGustMs = windGustKmh.map((v) => (v != null ? v / 3.6 : null));
    const visibilitySm = visibilityM.map((v) => (v != null ? v * 0.000621371 : null));
    // Null ceiling means unlimited (clear skies), not zero
    const ceilingFt = ceilingM.map((v) => (v != null ? Math.round(v * 3.28084) : null));

    // -----------------------------------------------------------------
    // 3. EVALUATE AND CACHE
    // -----------------------------------------------------------------
    // Fetch weather thresholds from DB
    const { data: thresholds, error: thresholdError } = await supabase
      .from("weather_thresholds")
      .select("*");

    if (thresholdError) {
      throw new Error(`Failed to fetch thresholds: ${thresholdError.message}`);
    }

    const cacheRows: Array<{
      forecast_hour: string;
      fetched_at: string;
      wind_speed_ms: number | null;
      wind_gust_ms: number | null;
      visibility_sm: number | null;
      cloud_ceiling_ft: number | null;
      precipitation_probability: number | null;
      temperature_c: number | null;
      sky_cover_pct: number | null;
      determination: WeatherDetermination;
      determination_reasons: string[];
    }> = [];

    for (let i = 0; i < FORECAST_HOURS; i++) {
      const hourDate = new Date(startHour.getTime() + i * 3600000);

      const metrics: WeatherMetrics = {
        wind_speed_ms: windSpeedMs[i],
        wind_gust_ms: windGustMs[i],
        visibility_sm: visibilitySm[i],
        cloud_ceiling_ft: ceilingFt[i],
        temperature_c: tempC[i],
        precipitation_probability: precipProb[i],
        kp_index: null, // KP index not available from NWS gridpoints
      };

      const evaluation = evaluateWeatherInline(metrics, thresholds || []);

      cacheRows.push({
        forecast_hour: hourDate.toISOString(),
        fetched_at: fetchedAt,
        wind_speed_ms: windSpeedMs[i] != null ? Math.round(windSpeedMs[i]! * 100) / 100 : null,
        wind_gust_ms: windGustMs[i] != null ? Math.round(windGustMs[i]! * 100) / 100 : null,
        visibility_sm: visibilitySm[i] != null ? Math.round(visibilitySm[i]! * 1000) / 1000 : null,
        cloud_ceiling_ft: ceilingFt[i],
        precipitation_probability: precipProb[i],
        temperature_c: tempC[i],
        sky_cover_pct: skyCover[i],
        determination: evaluation.determination,
        determination_reasons: evaluation.reasons,
      });
    }

    // Upsert all 48 rows (one per forecast hour)
    const { error: upsertError } = await supabase
      .from("weather_forecast_cache")
      .upsert(cacheRows, { onConflict: "forecast_hour" });

    if (upsertError) {
      throw new Error(`Cache upsert failed: ${upsertError.message}`);
    }

    // -----------------------------------------------------------------
    // 4. FLAG SCHEDULED JOBS
    // -----------------------------------------------------------------
    const endWindow = new Date(startHour.getTime() + FORECAST_HOURS * 3600000);

    const { data: scheduledJobs, error: jobsError } = await supabase
      .from("drone_jobs")
      .select("id, scheduled_date, scheduled_time")
      .gte("scheduled_date", startHour.toISOString().split("T")[0])
      .lte("scheduled_date", endWindow.toISOString().split("T")[0])
      .not("status", "in", '("delivered","cancelled")');

    if (jobsError) {
      console.error("Failed to query drone_jobs:", jobsError.message);
    }

    let jobsFlagged = 0;

    if (scheduledJobs && scheduledJobs.length > 0) {
      for (const job of scheduledJobs) {
        // Build a timestamp from scheduled_date and optional scheduled_time
        let jobTimestamp: Date;
        if (job.scheduled_time) {
          jobTimestamp = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
        } else {
          // Default to start of the scheduled date
          jobTimestamp = new Date(`${job.scheduled_date}T00:00:00Z`);
        }

        // Find the closest forecast hour
        const jobMs = jobTimestamp.getTime();
        let closestIdx = 0;
        let closestDiff = Infinity;

        for (let i = 0; i < cacheRows.length; i++) {
          const diff = Math.abs(new Date(cacheRows[i].forecast_hour).getTime() - jobMs);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestIdx = i;
          }
        }

        const forecast = cacheRows[closestIdx];
        const shouldHold = forecast.determination === "NO_GO" || forecast.determination === "CAUTION";

        const { error: updateError } = await supabase
          .from("drone_jobs")
          .update({
            weather_hold: shouldHold,
            weather_hold_reasons: shouldHold ? forecast.determination_reasons : null,
          })
          .eq("id", job.id);

        if (updateError) {
          console.error(`Failed to update job ${job.id}:`, updateError.message);
        } else if (shouldHold) {
          jobsFlagged++;
        }
      }
    }

    // -----------------------------------------------------------------
    // Success response
    // -----------------------------------------------------------------
    console.log(JSON.stringify({
      event: "weather_forecast_fetch",
      fetched_at: fetchedAt,
      hours: FORECAST_HOURS,
      jobs_checked: scheduledJobs?.length || 0,
      jobs_flagged: jobsFlagged,
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        hours: FORECAST_HOURS,
        jobs_flagged: jobsFlagged,
        fetched_at: fetchedAt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    // Fail-open: log error but return 200 so pg_cron does not raise alarms
    const message = (err as Error).message;
    console.error("weather-forecast-fetch error:", message);

    return new Response(
      JSON.stringify({ ok: false, error: message, fetched_at: fetchedAt }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Intentional fail-open
      }
    );
  }
});
