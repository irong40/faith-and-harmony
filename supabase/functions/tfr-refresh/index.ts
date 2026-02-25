import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Hampton Roads area bounding box (lat/lon)
const HAMPTON_ROADS_BOUNDS = {
  minLat: 36.5,
  maxLat: 37.5,
  minLon: -77.5,
  maxLon: -75.5,
};

interface FaaTfrRecord {
  notamId?: string;
  type?: string;
  description?: string;
  location?: {
    lat?: number;
    lon?: number;
    radius?: number;
  };
  altitudeLimits?: {
    floor?: number;
    ceiling?: number;
  };
  effectiveStart?: string;
  effectiveEnd?: string;
}

interface AviationWeatherNotam {
  notamID?: string;
  icaoLocation?: string;
  type?: string;
  text?: string;
  startValidity?: string;
  endValidity?: string;
  centerPoint?: {
    latitude?: number;
    longitude?: number;
  };
  radius?: number;
  lowerLimit?: string;
  upperLimit?: string;
}

function isInBounds(lat: number | null, lon: number | null): boolean {
  if (lat == null || lon == null) return true; // Include if no location (conservative)
  return (
    lat >= HAMPTON_ROADS_BOUNDS.minLat &&
    lat <= HAMPTON_ROADS_BOUNDS.maxLat &&
    lon >= HAMPTON_ROADS_BOUNDS.minLon &&
    lon <= HAMPTON_ROADS_BOUNDS.maxLon
  );
}

function parseFtFromString(val: string | null | undefined): number | null {
  if (!val) return null;
  const match = val.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const refreshedAt = new Date().toISOString();
  let totalFetched = 0;
  let totalUpserted = 0;
  let errors: string[] = [];

  try {
    // -------------------------------------------------------
    // Primary: FAA TFR list (public, no auth required)
    // -------------------------------------------------------
    let primaryRecords: Array<{
      notam_number: string;
      tfr_type: string | null;
      description: string | null;
      center_latitude: number | null;
      center_longitude: number | null;
      radius_nm: number | null;
      floor_ft: number | null;
      ceiling_ft: number | null;
      effective_start: string | null;
      effective_end: string | null;
      status: string;
      fetched_at: string;
      raw_data: unknown;
    }> = [];

    try {
      // FAA TFR XML-to-JSON endpoint
      const faaResponse = await fetch(
        "https://tfr.faa.gov/tfr2/list.json",
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15000),
        },
      );

      if (faaResponse.ok) {
        const faaData = await faaResponse.json();
        const tfrs: FaaTfrRecord[] = Array.isArray(faaData)
          ? faaData
          : faaData?.TFRAreaList || [];

        totalFetched = tfrs.length;

        for (const tfr of tfrs) {
          const lat = tfr.location?.lat ?? null;
          const lon = tfr.location?.lon ?? null;

          if (!isInBounds(lat, lon)) continue;

          const notamId = tfr.notamId || `FAA-${Date.now()}-${Math.random()}`;
          const now = new Date();
          const endDate = tfr.effectiveEnd ? new Date(tfr.effectiveEnd) : null;
          const status = endDate && endDate < now ? "expired" : "active";

          primaryRecords.push({
            notam_number: notamId,
            tfr_type: tfr.type || null,
            description: tfr.description || null,
            center_latitude: lat,
            center_longitude: lon,
            radius_nm: tfr.location?.radius
              ? tfr.location.radius / 1852 // meters → NM
              : null,
            floor_ft: tfr.altitudeLimits?.floor ?? null,
            ceiling_ft: tfr.altitudeLimits?.ceiling ?? null,
            effective_start: tfr.effectiveStart || null,
            effective_end: tfr.effectiveEnd || null,
            status,
            fetched_at: refreshedAt,
            raw_data: tfr,
          });
        }
      } else {
        errors.push(`FAA primary feed: HTTP ${faaResponse.status}`);
      }
    } catch (err) {
      errors.push(`FAA primary feed: ${(err as Error).message}`);
    }

    // -------------------------------------------------------
    // Fallback: AviationWeather.gov NOTAM API
    // -------------------------------------------------------
    if (primaryRecords.length === 0) {
      try {
        const awResponse = await fetch(
          `https://aviationweather.gov/api/data/notam?bbox=${HAMPTON_ROADS_BOUNDS.minLon},${HAMPTON_ROADS_BOUNDS.minLat},${HAMPTON_ROADS_BOUNDS.maxLon},${HAMPTON_ROADS_BOUNDS.maxLat}&format=json`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(15000),
          },
        );

        if (awResponse.ok) {
          const awData: AviationWeatherNotam[] = await awResponse.json();
          totalFetched = awData.length;

          for (const notam of awData) {
            const lat = notam.centerPoint?.latitude ?? null;
            const lon = notam.centerPoint?.longitude ?? null;
            const notamId = notam.notamID || `AW-${Date.now()}-${Math.random()}`;
            const now = new Date();
            const endDate = notam.endValidity ? new Date(notam.endValidity) : null;
            const status = endDate && endDate < now ? "expired" : "active";

            primaryRecords.push({
              notam_number: notamId,
              tfr_type: notam.type || "NOTAM",
              description: notam.text || null,
              center_latitude: lat,
              center_longitude: lon,
              radius_nm: notam.radius ? notam.radius / 1852 : null,
              floor_ft: parseFtFromString(notam.lowerLimit),
              ceiling_ft: parseFtFromString(notam.upperLimit),
              effective_start: notam.startValidity || null,
              effective_end: notam.endValidity || null,
              status,
              fetched_at: refreshedAt,
              raw_data: notam,
            });
          }
        } else {
          errors.push(`AviationWeather fallback: HTTP ${awResponse.status}`);
        }
      } catch (err) {
        errors.push(`AviationWeather fallback: ${(err as Error).message}`);
      }
    }

    // -------------------------------------------------------
    // Mark previously active TFRs as expired if not in new fetch
    // -------------------------------------------------------
    const { data: existingActive } = await supabase
      .from("tfr_cache")
      .select("notam_number")
      .in("status", ["active", "scheduled"]);

    const newNotamIds = new Set(primaryRecords.map((r) => r.notam_number));
    const toExpire = (existingActive || [])
      .map((r) => r.notam_number)
      .filter((id) => !newNotamIds.has(id));

    if (toExpire.length > 0) {
      await supabase
        .from("tfr_cache")
        .update({ status: "expired", fetched_at: refreshedAt })
        .in("notam_number", toExpire);
    }

    // -------------------------------------------------------
    // Upsert new/updated TFRs
    // -------------------------------------------------------
    if (primaryRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from("tfr_cache")
        .upsert(primaryRecords, { onConflict: "notam_number" });

      if (upsertError) {
        errors.push(`Upsert error: ${upsertError.message}`);
      } else {
        totalUpserted = primaryRecords.length;
      }
    }

    // Log the refresh result
    console.log(JSON.stringify({
      event: "tfr_refresh",
      refreshed_at: refreshedAt,
      total_fetched: totalFetched,
      in_area: primaryRecords.length,
      upserted: totalUpserted,
      expired: toExpire.length,
      errors,
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        refreshed_at: refreshedAt,
        total_fetched: totalFetched,
        in_area: primaryRecords.length,
        upserted: totalUpserted,
        expired: toExpire.length,
        errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    // Fail-open: log the error but return 200 so pg_cron doesn't alarm
    const message = (err as Error).message;
    console.error("tfr-refresh fatal error:", message);

    return new Response(
      JSON.stringify({ ok: false, error: message, refreshed_at: refreshedAt }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Intentional: fail-open per P13
      },
    );
  }
});
