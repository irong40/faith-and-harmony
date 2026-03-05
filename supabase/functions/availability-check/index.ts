// Availability Check Edge Function
// Phase 4: Scheduling and Availability (SCHED-04)
//
// Computes open dates by merging availability_slots (weekly defaults),
// availability_overrides (date exceptions), and blackout_dates (full blocks).
// Returns both ISO date strings and human readable strings for Vapi bot.
//
// Endpoints:
//   GET ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD           -> All service types
//   GET ?start_date=...&end_date=...&service_type=re_basic    -> Filtered by service type
//   OPTIONS                                                    -> CORS preflight

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Format "2026-03-10" as "Monday March 10"
export function formatReadable(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(req.url);
  const serviceType = url.searchParams.get('service_type');
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  if (!startDate || !endDate) {
    return json({ error: 'start_date and end_date query params are required (YYYY-MM-DD)' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch active day-of-week slots
  let slotsQuery = supabase
    .from('availability_slots')
    .select('day_of_week')
    .eq('is_active', true);

  if (serviceType) {
    slotsQuery = slotsQuery.or(`service_type.eq.${serviceType},service_type.is.null`);
  } else {
    slotsQuery = slotsQuery.is('service_type', null);
  }

  const { data: slots } = await slotsQuery;
  const activeDays = new Set(
    (slots ?? []).map((s: { day_of_week: number }) => s.day_of_week),
  );

  // Fetch overrides in range
  const { data: overrides } = await supabase
    .from('availability_overrides')
    .select('override_date, is_available')
    .gte('override_date', startDate)
    .lte('override_date', endDate);

  const overrideMap = new Map<string, boolean>();
  for (const o of overrides ?? []) {
    overrideMap.set(o.override_date, o.is_available);
  }

  // Fetch blackout dates in range
  const { data: blackouts } = await supabase
    .from('blackout_dates')
    .select('blackout_date')
    .gte('blackout_date', startDate)
    .lte('blackout_date', endDate);

  const blackoutSet = new Set(
    (blackouts ?? []).map((b: { blackout_date: string }) => b.blackout_date),
  );

  // Generate dates in range and filter
  const availableDates: string[] = [];
  const current = new Date(startDate + 'T12:00:00Z');
  const end = new Date(endDate + 'T12:00:00Z');

  while (current <= end) {
    const isoDate = current.toISOString().slice(0, 10);
    const dow = current.getUTCDay(); // 0=Sun, matches PostgreSQL DOW

    if (!blackoutSet.has(isoDate)) {
      if (overrideMap.has(isoDate)) {
        if (overrideMap.get(isoDate) === true) {
          availableDates.push(isoDate);
        }
      } else if (activeDays.has(dow)) {
        availableDates.push(isoDate);
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  const readableList = availableDates.map(formatReadable);
  const readableDates =
    readableList.length > 0
      ? readableList.join(', ')
      : 'No dates are currently available in that range';

  return json({
    available_dates: availableDates,
    readable_dates: readableDates,
    count: availableDates.length,
  });
}

serve(handleRequest);
