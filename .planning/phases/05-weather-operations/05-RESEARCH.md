# Phase 5: Weather Operations - Research

**Researched:** 2026-03-03
**Domain:** NWS API integration, flight parameter validation, scheduled weather checks, admin weather dashboard
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WTHR-01 | Weather API integration fetching 48-hour forecasts for Hampton Roads | NWS raw gridpoints endpoint at AKQ/90,52 provides 8-day hourly data including windSpeed, windGust, probabilityOfPrecipitation, ceilingHeight, visibility, skyCover. All unit conversions documented. |
| WTHR-02 | Flight parameter validation: max wind (sustained and gusts), precipitation probability, visibility minimum, cloud ceiling minimum | `evaluateWeather()` function already exists in `src/lib/weather-evaluation.ts` and `weather_thresholds` table already seeded with DJI limits. NWS data maps cleanly to existing schema. |
| WTHR-03 | Automated check runs against scheduled jobs and flags unsafe conditions | pg_cron pattern already in use for TFR refresh. New `weather-check` edge function + pg_cron schedule. Queries drone_jobs for jobs in next 48 hours, fetches NWS, writes flags to `weather_forecast_cache` table. |
| WTHR-04 | Admin weather view showing current conditions and a 48-hour forecast with pass/fail indicators against flight parameters | New admin page at `/admin/weather` following Dashboard.tsx pattern. React Query for forecast data, tanstack table for hourly pass/fail grid, lucide icons for status indicators. |
</phase_requirements>

---

## Summary

This phase has a significant head start: the database schema, GO/CAUTION/NO_GO evaluation logic, and flight parameter thresholds are already built from the Trestle v2.0 pilot portal work. The `weather_thresholds` table is seeded with DJI limits for all three aircraft. The `evaluateWeather()` function in `src/lib/weather-evaluation.ts` already handles all five parameters. The `WeatherBriefingPanel` component already renders determination results with pass/fail indicators.

What Phase 5 builds on top of this foundation: a new `weather-forecast-fetch` edge function that pulls from the NWS raw gridpoints endpoint (not the hourly forecast endpoint, because the hourly endpoint gives windSpeed as a string like "5 mph" without gust data), a scheduled daily check via pg_cron that flags jobs in the next 48 hours, a `weather_forecast_cache` table to store fetched forecasts, and an admin weather view that renders the 48-hour outlook with per-hour pass/fail status.

The NWS raw gridpoints endpoint for Hampton Roads (office AKQ, gridX=90, gridY=52) is confirmed working and returns `windSpeed` in km/h, `windGust` in km/h, `visibility` in meters, `ceilingHeight` in meters, `probabilityOfPrecipitation` in percent, and `skyCover` in percent. All values arrive as time-series arrays with ISO 8601 interval timestamps. No API key required.

**Primary recommendation:** Use the NWS raw gridpoints endpoint (`https://api.weather.gov/gridpoints/AKQ/90,52`) for all forecast data. Reuse `evaluateWeather()` and `weather_thresholds` directly. Schedule the check via pg_cron calling a new edge function, matching the tfr-refresh cron pattern already in production.

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NWS API | free | Hourly weather forecasts, no key required | Already decided in PROJECT.md. Confirmed working for Hampton Roads at AKQ/90,52. |
| Supabase Edge Functions | Deno runtime | `weather-forecast-fetch` function runs NWS fetch + GO/NO_GO evaluation | Matches all 40+ existing edge functions in the project. |
| pg_cron + pg_net | Supabase built-in | Schedule daily weather check | Already in use for TFR refresh (30-min cron). Same pattern. |
| @tanstack/react-query | v5 | Fetch and cache forecast data in admin view | Already in use throughout admin pages. |
| Shadcn/ui + Tailwind | current | Admin weather page components | Already used in all admin pages. |
| lucide-react | current | Weather icons (Wind, Cloud, Eye, Thermometer) | Already used in WeatherBriefingPanel. |

### Supporting (already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| evaluateWeather() | local | Convert metrics to GO/CAUTION/NO_GO | Reuse directly from `src/lib/weather-evaluation.ts` |
| weather_thresholds table | DB | Aircraft and Part 107 flight limits | Query from edge function — already seeded |
| date-fns | current | Format forecast period timestamps | Already imported in Dashboard, DroneJobs pages |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| NWS raw gridpoints | NWS hourly forecast endpoint | Hourly endpoint has windSpeed as string ("5 mph"), no gust data, no ceilingHeight. Raw gridpoints gives proper typed values for all fields. Use raw gridpoints. |
| pg_cron daily schedule | n8n cron workflow | Both work. pg_cron keeps weather check in Supabase like TFR refresh. n8n adds a workflow to maintain. Use pg_cron for consistency. |
| New weather_forecast_cache table | Direct query NWS on admin page load | Client-side NWS fetch means CORS issues (NWS has permissive CORS but edge function is cleaner), no persistence for historical flag review, rate limiting risk. Cache in DB. |

**Installation:** No new packages required. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure

```
supabase/
  functions/
    weather-forecast-fetch/
      index.ts           # Fetch NWS, evaluate, upsert cache
  migrations/
    20260303XXXXXX_weather_forecast_cache.sql  # New table for forecast cache
    20260303XXXXXX_weather_forecast_cron.sql   # pg_cron schedule

src/
  pages/admin/
    WeatherOperations.tsx          # New admin page at /admin/weather
  components/admin/
    WeatherForecastGrid.tsx        # 48-hour hourly pass/fail table
    WeatherParameterConfig.tsx     # Edit flight thresholds per aircraft
  hooks/
    useWeatherForecast.ts          # React Query hook for forecast cache
```

### Pattern 1: NWS Raw Gridpoints Fetch in Edge Function

**What:** Fetch raw gridpoints from NWS, parse time-series values, expand ISO 8601 durations into per-hour slots, convert units.
**When to use:** In `weather-forecast-fetch` edge function for both the scheduled check and manual refresh.

```typescript
// Source: Verified live against https://api.weather.gov/gridpoints/AKQ/90,52
// Hampton Roads: office=AKQ, gridX=90, gridY=52 (confirmed for Norfolk lat/lon 36.8508,-76.2859)

const NWS_GRIDPOINT = 'https://api.weather.gov/gridpoints/AKQ/90,52';

type NwsTimeSeries = {
  uom: string;
  values: Array<{ validTime: string; value: number | null }>;
};

type NwsGridProperties = {
  windSpeed: NwsTimeSeries;        // uom: wmoUnit:km_h-1
  windGust: NwsTimeSeries;         // uom: wmoUnit:km_h-1
  visibility: NwsTimeSeries;       // uom: wmoUnit:m
  ceilingHeight: NwsTimeSeries;    // uom: wmoUnit:m
  probabilityOfPrecipitation: NwsTimeSeries; // uom: wmoUnit:percent
  skyCover: NwsTimeSeries;         // uom: wmoUnit:percent
  temperature: NwsTimeSeries;      // uom: wmoUnit:degC
};

async function fetchNwsGridpoint(): Promise<NwsGridProperties> {
  const response = await fetch(NWS_GRIDPOINT, {
    headers: {
      'User-Agent': 'SentinelAerial/1.0 admin@faithandharmonyllc.com',
      'Accept': 'application/geo+json',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`NWS fetch failed: ${response.status}`);
  const data = await response.json();
  return data.properties as NwsGridProperties;
}
```

### Pattern 2: ISO 8601 Duration Expansion

**What:** NWS returns time-series values with ISO 8601 interval notation like `"2026-03-03T08:00:00+00:00/PT3H"` meaning "this value applies for 3 hours starting at 08:00". Expand each entry into per-hour slots for the 48-hour window.
**When to use:** When building the hourly forecast array for the admin view.

```typescript
// Expand a NWS time-series into a flat array of hourly values for the next 48 hours
// ISO 8601 duration: "2026-03-03T08:00:00+00:00/PT3H" means 3 hours
// "2026-03-04T10:00:00+00:00/P1DT2H" means 26 hours

function parseDurationHours(duration: string): number {
  // PT3H -> 3, P1DT2H -> 26, PT1H -> 1
  const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?/);
  if (!match) return 1;
  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  return days * 24 + hours;
}

function expandToHourly(
  series: NwsTimeSeries,
  fromUtc: Date,
  hours: number
): Array<number | null> {
  const result: Array<number | null> = new Array(hours).fill(null);

  for (const entry of series.values) {
    const [isoTime, durationStr] = entry.validTime.split('/');
    const start = new Date(isoTime);
    const durationHours = parseDurationHours(durationStr);

    for (let h = 0; h < durationHours; h++) {
      const slotTime = new Date(start.getTime() + h * 3600000);
      const offsetHours = Math.round(
        (slotTime.getTime() - fromUtc.getTime()) / 3600000
      );
      if (offsetHours >= 0 && offsetHours < hours) {
        result[offsetHours] = entry.value;
      }
    }
  }

  return result;
}
```

### Pattern 3: Unit Conversion for Evaluation Compatibility

**What:** NWS raw gridpoints uses km/h for wind and meters for visibility/ceiling. The `weather_thresholds` table and `evaluateWeather()` function use m/s for wind and statute miles for visibility and feet for ceiling. Convert at fetch time.

```typescript
// Source: confirmed against live NWS data (2026-03-03)
const KMH_TO_MS = 1 / 3.6;           // km/h -> m/s
const M_TO_SM = 0.000621371;          // meters -> statute miles
const M_TO_FT = 3.28084;             // meters -> feet

function convertNwsToEvalMetrics(
  windSpeedKmh: number | null,
  windGustKmh: number | null,
  visibilityM: number | null,
  ceilingM: number | null,
  precipPct: number | null,
  tempC: number | null
) {
  return {
    wind_speed_ms: windSpeedKmh !== null ? windSpeedKmh * KMH_TO_MS : null,
    wind_gust_ms: windGustKmh !== null ? windGustKmh * KMH_TO_MS : null,
    visibility_sm: visibilityM !== null ? visibilityM * M_TO_SM : null,
    cloud_ceiling_ft: ceilingM !== null ? Math.round(ceilingM * M_TO_FT) : null,
    precipitation_probability: precipPct,
    temperature_c: tempC,
    kp_index: null,  // NWS does not provide Kp index — not a blocker for this phase
  };
}
```

### Pattern 4: pg_cron Schedule (Daily Weather Check)

**What:** Schedule a daily cron job that calls the weather-forecast-fetch edge function.
**When to use:** In a new migration file for the weather cron.

```sql
-- Source: follows 20260225400000_enable_tfr_cron_schedule.sql pattern
SELECT cron.schedule(
  'weather-forecast-check',
  '0 6 * * *',  -- 6 AM UTC daily (2 AM EDT, before morning flights)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url')
      || '/functions/v1/weather-forecast-fetch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer '
        || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

### Pattern 5: Weather Forecast Cache Table

**What:** Store the 48-hour hourly forecast in Supabase so the admin view does not hit NWS on every page load.
**When to use:** Written by the edge function after each successful fetch.

```sql
-- New table: weather_forecast_cache
CREATE TABLE public.weather_forecast_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  forecast_hour TIMESTAMPTZ NOT NULL,   -- The UTC hour this row represents
  wind_speed_ms NUMERIC(5,2),
  wind_gust_ms NUMERIC(5,2),
  visibility_sm NUMERIC(6,3),
  cloud_ceiling_ft INTEGER,
  precipitation_probability INTEGER,
  temperature_c NUMERIC(5,1),
  sky_cover_pct INTEGER,
  determination public.weather_determination NOT NULL,
  determination_reasons TEXT[],
  UNIQUE (forecast_hour)  -- one row per hour, upserted on each fetch
);
```

### Pattern 6: Flagging Scheduled Jobs

**What:** After building the 48-hour evaluation, join against `drone_jobs` to find jobs scheduled in the window with conditions outside safe parameters.
**When to use:** In the `weather-forecast-fetch` edge function, after upserting the forecast cache.

```typescript
// Query jobs scheduled in next 48 hours
const { data: scheduledJobs } = await supabase
  .from('drone_jobs')
  .select('id, job_number, scheduled_date, scheduled_time, status')
  .gte('scheduled_date', now.toISOString().slice(0, 10))
  .lte('scheduled_date', cutoff.toISOString().slice(0, 10))
  .not('status', 'in', '("delivered","cancelled")');

// For each job, find the forecast hour and check determination
// Flag jobs with NO_GO or CAUTION by upserting a weather_job_flags row
```

### Anti-Patterns to Avoid

- **Fetching the hourly forecast endpoint for evaluation data.** `windSpeed` comes as "5 mph" string, no gust data, no ceilingHeight. Use the raw gridpoints endpoint instead.
- **Calling NWS from the React client.** NWS has permissive CORS but a User-Agent header is required, fetch timeout behavior is unpredictable from browsers, and there is no caching. Use the edge function + DB cache pattern.
- **Re-implementing weather evaluation.** `evaluateWeather()` in `src/lib/weather-evaluation.ts` already handles all five parameters with proper CAUTION/NO_GO escalation. Import it in the edge function (or port the logic verbatim to Deno).
- **Creating a new flight parameter config UI for Phase 5.** The `weather_thresholds` table already exists and is editable. The admin view for Phase 5 reads from it, does not need to build a new CRUD interface.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weather evaluation logic | Custom threshold comparisons | `evaluateWeather()` in `src/lib/weather-evaluation.ts` | Already handles 5 params, CAUTION/NO_GO escalation, all edge cases. 17 passing tests. |
| Flight thresholds storage | Hardcoded constants | `weather_thresholds` table (already seeded) | Per-aircraft limits, Part 107 minimums, package-type modifiers already in DB. |
| ISO 8601 duration parsing | date-fns interval parsing | Simple regex `P(?:(\d+)D)?T?(?:(\d+)H)?` | NWS intervals are always in hours/days, no minutes/seconds. Simple regex is sufficient. Avoids a new dependency. |
| Wind speed unit detection | Parsing "5 mph" strings | Raw gridpoints endpoint (uom: wmoUnit:km_h-1) | Hourly endpoint gives strings, raw gridpoints gives typed numbers. |
| Scheduled check trigger | Custom cron service | pg_cron + pg_net (already in use) | TFR refresh already uses this exact pattern. No new infrastructure. |

**Key insight:** 80% of the weather evaluation infrastructure already exists. Phase 5 primarily builds the data pipeline (NWS fetch edge function, cron schedule, forecast cache table) and the admin view on top of it.

---

## Common Pitfalls

### Pitfall 1: Using the Hourly Forecast Endpoint Instead of Raw Gridpoints

**What goes wrong:** `windSpeed` returns as "5 mph" string. Parsing this is fragile and it does not include gust data. `ceilingHeight` is absent entirely from the hourly endpoint.
**Why it happens:** The hourly endpoint is what appears in examples and documentation. It looks correct but lacks the fields needed for flight evaluation.
**How to avoid:** Always use `https://api.weather.gov/gridpoints/AKQ/90,52` (the raw gridpoints endpoint). The full list of available fields was verified live on 2026-03-03.
**Warning signs:** If your wind speed parsing code has a regex matching "mph" or "kt", you are on the wrong endpoint.

### Pitfall 2: NWS User-Agent Requirement

**What goes wrong:** Requests without a User-Agent header return HTTP 403 with a message asking for contact information.
**Why it happens:** NWS Terms of Service require a User-Agent identifying your application and contact email.
**How to avoid:** Always include `'User-Agent': 'SentinelAerial/1.0 admin@faithandharmonyllc.com'` in the fetch headers.
**Warning signs:** 403 response from NWS API.

### Pitfall 3: ISO 8601 Duration Expansion Off-by-One

**What goes wrong:** A value of "2026-03-03T08:00:00+00:00/PT3H" applies to hours 8, 9, and 10 (not 8, 9, 10, 11). The duration is the length of the period, not inclusive of the next period start.
**Why it happens:** Natural tendency to use `<= durationHours` in the loop instead of `< durationHours`.
**How to avoid:** Loop `for h in range(0, durationHours)` — duration is exclusive of endpoint.
**Warning signs:** Duplicate values in adjacent hours, or gaps between periods.

### Pitfall 4: NWS Rate Limiting

**What goes wrong:** NWS API is a free public service with informal rate limits. Hammering it triggers throttling or temporary blocks.
**Why it happens:** Daily scheduled checks are fine. Problems arise if the admin page refreshes NWS directly on every load, or if the cron runs hourly.
**How to avoid:** One daily cron fetch. Admin view reads from `weather_forecast_cache` table, not NWS directly. Manual refresh in admin UI is optional, behind a button, not on page mount.
**Warning signs:** 429 or 503 responses from api.weather.gov.

### Pitfall 5: `evaluateWeather()` is Client-Side Only as Typed

**What goes wrong:** The function imports `WeatherThreshold` from `@/types/weather` using the path alias. This alias does not resolve in Deno (edge functions).
**Why it happens:** Vite path aliases (`@/`) are not available in Deno runtime.
**How to avoid:** In the edge function, either define the threshold type inline or port the evaluation logic verbatim without imports. The logic is simple enough to duplicate. Do not attempt to share via a module that requires `@/` resolution.
**Warning signs:** Deno import errors mentioning `@/types/weather` or similar.

### Pitfall 6: ceilingHeight = null is NOT the Same as "Clear Skies"

**What goes wrong:** When NWS returns no ceilingHeight data for a period (unlimited ceiling, SKC/CLR), the value may be null or may not appear in the time series. Treating null as a NO_GO or evaluating it as zero causes false flags.
**Why it happens:** The existing `evaluateWeather()` correctly skips null metrics (only evaluates when both threshold and metric are non-null). Verify the NWS ceilingHeight field behaves the same way for clear conditions.
**How to avoid:** When `ceilingHeight` is null from NWS, pass `null` to `evaluateWeather()` (not 0). The evaluation function will skip the ceiling check correctly.
**Warning signs:** Every clear-sky forecast period showing NO_GO for ceiling.

---

## Code Examples

### Full NWS Fetch and Parse Pattern (Edge Function)

```typescript
// Source: Verified against live NWS API endpoint 2026-03-03
// supabase/functions/weather-forecast-fetch/index.ts

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const NWS_URL = 'https://api.weather.gov/gridpoints/AKQ/90,52';
const NWS_HEADERS = {
  'User-Agent': 'SentinelAerial/1.0 admin@faithandharmonyllc.com',
  'Accept': 'application/geo+json',
};

const KMH_TO_MS = 1 / 3.6;
const M_TO_SM = 0.000621371;
const M_TO_FT = 3.28084;

// Parse "PT3H" or "P1DT2H" to integer hours
function parseDurationHours(d: string): number {
  const m = d.match(/P(?:(\d+)D)?T?(?:(\d+)H)?/);
  if (!m) return 1;
  return (parseInt(m[1] || '0') * 24) + parseInt(m[2] || '0');
}

// Expand compressed time series to one value per hour for `count` hours starting from `fromUtc`
function expandToHourly(
  series: { values: Array<{ validTime: string; value: number | null }> } | undefined,
  fromUtc: Date,
  count: number
): Array<number | null> {
  if (!series) return new Array(count).fill(null);
  const result: Array<number | null> = new Array(count).fill(null);
  for (const entry of series.values) {
    const [isoTime, dur] = entry.validTime.split('/');
    const start = new Date(isoTime);
    const hours = parseDurationHours(dur);
    for (let h = 0; h < hours; h++) {
      const slot = Math.round(
        (new Date(start.getTime() + h * 3_600_000).getTime() - fromUtc.getTime())
        / 3_600_000
      );
      if (slot >= 0 && slot < count) result[slot] = entry.value;
    }
  }
  return result;
}

serve(async (req) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const HOURS = 48;
  const now = new Date();
  // Round down to current hour
  const fromUtc = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

  const res = await fetch(NWS_URL, {
    headers: NWS_HEADERS,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`NWS ${res.status}`);
  const { properties: p } = await res.json();

  const windSpeeds = expandToHourly(p.windSpeed, fromUtc, HOURS);
  const windGusts  = expandToHourly(p.windGust, fromUtc, HOURS);
  const visibilities = expandToHourly(p.visibility, fromUtc, HOURS);
  const ceilings   = expandToHourly(p.ceilingHeight, fromUtc, HOURS);
  const precips    = expandToHourly(p.probabilityOfPrecipitation, fromUtc, HOURS);
  const skyCover   = expandToHourly(p.skyCover, fromUtc, HOURS);
  const temps      = expandToHourly(p.temperature, fromUtc, HOURS);

  // Fetch thresholds from DB (Part 107 minimums + all aircraft limits)
  const { data: thresholds } = await supabase
    .from('weather_thresholds')
    .select('*');

  const rows = [];
  for (let h = 0; h < HOURS; h++) {
    const forecastHour = new Date(fromUtc.getTime() + h * 3_600_000);
    const metrics = {
      wind_speed_ms: windSpeeds[h] !== null ? windSpeeds[h]! * KMH_TO_MS : null,
      wind_gust_ms:  windGusts[h]  !== null ? windGusts[h]!  * KMH_TO_MS : null,
      visibility_sm: visibilities[h] !== null ? visibilities[h]! * M_TO_SM : null,
      cloud_ceiling_ft: ceilings[h] !== null ? Math.round(ceilings[h]! * M_TO_FT) : null,
      precipitation_probability: precips[h],
      temperature_c: temps[h],
      kp_index: null,
    };

    // Port evaluateWeather logic here (no @/ imports in Deno)
    // Returns: { determination: 'GO' | 'CAUTION' | 'NO_GO', reasons: string[] }
    const evaluation = evaluateWeatherInline(metrics, thresholds || []);

    rows.push({
      forecast_hour: forecastHour.toISOString(),
      wind_speed_ms: metrics.wind_speed_ms,
      wind_gust_ms: metrics.wind_gust_ms,
      visibility_sm: metrics.visibility_sm,
      cloud_ceiling_ft: metrics.cloud_ceiling_ft,
      precipitation_probability: metrics.precipitation_probability,
      temperature_c: metrics.temperature_c,
      sky_cover_pct: skyCover[h],
      determination: evaluation.determination,
      determination_reasons: evaluation.reasons,
    });
  }

  await supabase
    .from('weather_forecast_cache')
    .upsert(rows, { onConflict: 'forecast_hour' });

  return new Response(
    JSON.stringify({ ok: true, hours: rows.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
```

### React Query Hook for Admin View

```typescript
// Source: follows useWeatherBriefing.ts pattern
// src/hooks/useWeatherForecast.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  determination: 'GO' | 'CAUTION' | 'NO_GO';
  determination_reasons: string[] | null;
};

export function useWeatherForecast() {
  return useQuery({
    queryKey: ['weather-forecast'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const cutoff = new Date(Date.now() + 48 * 3600000).toISOString();
      const { data, error } = await supabase
        .from('weather_forecast_cache')
        .select('*')
        .gte('forecast_hour', now)
        .lte('forecast_hour', cutoff)
        .order('forecast_hour', { ascending: true });
      if (error) throw error;
      return (data || []) as ForecastRow[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — daily check means cache is good
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NWS XML/DWML format | JSON-LD via api.weather.gov | 2017 | Much easier to parse in TypeScript/Deno |
| METAR only for weather briefings | NWS forecast (48h ahead) for scheduling | Phase 5 adds this | METAR is current conditions for pilots. NWS forecast is future planning for admin. Both co-exist. |
| No forecast in admin | weather_forecast_cache + admin view | This phase | Admin can see upcoming risk windows before calling clients |

**Deprecated/outdated:**
- DWML (Digital Weather Markup Language): NWS still supports it but JSON is the current standard. Do not use DWML.
- `aviationweather.gov/api/data/metar`: Used by the existing pilot-side WeatherBriefingPanel for current METAR. Still valid for that purpose. Do NOT replace it. Phase 5 is about forecast data from NWS, not current conditions from METAR.

---

## Open Questions

1. **What is the correct Hampton Roads gridpoint for jobs outside Norfolk city limits?**
   - What we know: AKQ/90,52 was verified for coordinates 36.8508, -76.2859 (Portsmouth, VA). Hampton Roads jobs may be in Virginia Beach, Chesapeake, Newport News.
   - What's unclear: Whether one gridpoint is sufficient for the entire Hampton Roads service area or whether each job's coordinates should resolve its own gridpoint.
   - Recommendation: AKQ/90,52 is close enough for admin scheduling purposes. The forecast check is about flagging unsafe days broadly. Use a single Norfolk-area gridpoint. If per-job precision is needed later, call `https://api.weather.gov/points/{lat},{lon}` at job creation to resolve the gridpoint and cache in `drone_jobs.nearest_weather_station` (column already exists).

2. **Should the weather check flag jobs or create a blocking state?**
   - What we know: The success criteria say "flags any job in the next 48 hours with conditions outside safe parameters." The admin view shows pass/fail.
   - What's unclear: Whether the flag should prevent status changes, send a notification, or only display in the UI.
   - Recommendation: Phase 5 scope is display-only flags. A `weather_job_flags` table or a column on `drone_jobs` (e.g., `weather_hold: boolean`) would surface in the admin view. No blocking logic. Admin decides what to do.

3. **Is the 6 AM UTC daily cron sufficient or does the admin need on-demand refresh?**
   - What we know: Phase 5 success criteria require the admin view to show current + 48-hour forecast.
   - What's unclear: If admin checks weather at 5 PM after the daily cron has already run, the cache is 11 hours stale.
   - Recommendation: Add a manual refresh button on the admin weather page that calls `weather-forecast-fetch` directly (via the n8n-relay pattern or a direct service-role call). Keep the daily cron but allow on-demand refresh.

---

## Existing Infrastructure Summary (Critical for Planning)

Phase 5 must build ON these, not rebuild them:

| What Exists | Location | How Phase 5 Uses It |
|-------------|----------|---------------------|
| `weather_thresholds` table | DB, already seeded | Read in edge function to evaluate each forecast hour |
| `weather_determination` enum (GO/CAUTION/NO_GO) | DB type | Used in `weather_forecast_cache.determination` |
| `evaluateWeather()` function | `src/lib/weather-evaluation.ts` | Port logic verbatim to edge function (no @/ alias) |
| `WeatherBriefingPanel` icons + layout | `src/components/pilot/WeatherBriefingPanel.tsx` | Reuse Wind, Cloud, Eye, Thermometer icons and GO/CAUTION/NO_GO badge pattern |
| pg_cron schedule pattern | `20260225400000_enable_tfr_cron_schedule.sql` | Copy pattern for weather-forecast-check cron |
| `drone_jobs.nearest_weather_station` column | DB | Optionally used for per-job station lookup |
| TFR refresh edge function pattern | `supabase/functions/tfr-refresh/index.ts` | Follow same serve() + corsHeaders + fail-open pattern |
| `date-fns` with `format` | Already in Dashboard.tsx | Use for formatting forecast hour labels |

---

## NWS API Reference for Hampton Roads

| Field | NWS Property | Unit | Conversion to eval unit |
|-------|-------------|------|------------------------|
| Wind speed (sustained) | `windSpeed` | wmoUnit:km_h-1 | `* (1/3.6)` → m/s |
| Wind gust | `windGust` | wmoUnit:km_h-1 | `* (1/3.6)` → m/s |
| Visibility | `visibility` | wmoUnit:m | `* 0.000621371` → statute miles |
| Cloud ceiling | `ceilingHeight` | wmoUnit:m | `* 3.28084` → feet |
| Precipitation probability | `probabilityOfPrecipitation` | wmoUnit:percent | No conversion (integer %) |
| Sky cover | `skyCover` | wmoUnit:percent | No conversion needed |
| Temperature | `temperature` | wmoUnit:degC | No conversion (already Celsius) |

**Confirmed Hampton Roads gridpoint:** `https://api.weather.gov/gridpoints/AKQ/90,52`
- Verified live 2026-03-03 for coordinates 36.8508N, 76.2859W (Portsmouth, VA)
- NWS office: AKQ (Wakefield, VA)
- Data coverage: 8 days, hourly time series with ISO 8601 interval encoding

---

## Sources

### Primary (HIGH confidence)

- Live NWS API call `https://api.weather.gov/gridpoints/AKQ/90,52` (verified 2026-03-03) — confirmed all field names, units, and data structure
- Live NWS API call `https://api.weather.gov/points/36.8508,-76.2859` (verified 2026-03-03) — confirmed AKQ/90,52 as the correct Hampton Roads gridpoint
- `D:/Projects/FaithandHarmony/src/lib/weather-evaluation.ts` — existing evaluation logic to reuse
- `D:/Projects/FaithandHarmony/supabase/migrations/20260210120200_weather_system.sql` — existing schema: weather_thresholds, mission_weather_logs, weather_determination enum, seeded DJI limits
- `D:/Projects/FaithandHarmony/supabase/migrations/20260225400000_enable_tfr_cron_schedule.sql` — existing pg_cron pattern to replicate

### Secondary (MEDIUM confidence)

- `https://weather-gov.github.io/api/gridpoints` — NWS API FAQ confirming windSpeed, windGust, probabilityOfPrecipitation, visibility, skyCover, ceilingHeight as available fields
- `https://api.weather.gov/gridpoints/AKQ/90,52/forecast/hourly` — confirmed hourly endpoint limitations (windSpeed as string, no ceilingHeight)

### Tertiary (LOW confidence)

- NWS rate limiting behavior: informal community reports. Not officially documented. Treat as LOW confidence. Design to avoid high-frequency fetches regardless.

---

## Metadata

**Confidence breakdown:**
- NWS API fields and units: HIGH — verified live against actual endpoint
- Architecture patterns: HIGH — follows existing TFR refresh, WeatherBriefingPanel, and pg_cron patterns in the project
- DJI drone wind limits: HIGH — seeded in weather_thresholds table from manufacturer specs, already in production
- NWS rate limits: LOW — not officially documented, based on community reports only
- Admin UI design: MEDIUM — follows established Dashboard.tsx pattern but specific layout is Claude's discretion

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (NWS API is stable, DJI limits do not change)
