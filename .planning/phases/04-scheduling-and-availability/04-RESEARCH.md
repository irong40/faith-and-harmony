# Phase 4: Scheduling and Availability - Research

**Researched:** 2026-03-03
**Domain:** PostgreSQL availability schema design, Supabase edge functions, react-day-picker v8, Vapi tool calls
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHED-01 | Availability slots table with day-of-week defaults and date-specific overrides | Two-table schema pattern: `availability_slots` (day_of_week defaults) + `availability_overrides` (date-specific); query merges them at runtime |
| SCHED-02 | Blackout dates table for weather holds, holidays, and maintenance days | Dedicated `blackout_dates` table with reason enum; edge function filters these out before returning open dates |
| SCHED-03 | Admin UI page for managing weekly availability and blackout dates | Existing `react-day-picker` v8 Calendar component in the project; week-view built with Tabs + modifiers; mutations via TanStack Query useMutation |
| SCHED-04 | Edge function returns available dates for a service type and date range | GET `/availability-check?service_type=X&start_date=Y&end_date=Z`; follows existing `pricing-lookup` pattern; returns array of ISO date strings |
| SCHED-05 | Bot offers available dates during call and captures preferred date | Vapi custom tool (type: "function" with server URL) calls the edge function; bot reads response and states open dates to caller |
</phase_requirements>

---

## Summary

Phase 4 adds three independent pieces that connect together: the database schema (SCHED-01, SCHED-02), the admin UI (SCHED-03), and the availability edge function and Vapi integration (SCHED-04, SCHED-05). The schema question is the most important design decision because it determines how the edge function query works and what the admin UI writes.

The standard pattern for this type of scheduling system uses two tables working together. A `availability_slots` table stores day-of-week defaults (Monday through Friday, 8am to 5pm). A separate `availability_overrides` table stores date-specific exceptions that either add or remove availability on a specific calendar date. The edge function computes available dates by starting from the day-of-week defaults, applying overrides, then subtracting any blackout dates. This is a well-understood PostgreSQL pattern that avoids storing one row per future date (which would require a cron job to pre-populate).

The admin UI requires no new libraries. The project already has `react-day-picker` v8 (via the Shadcn Calendar component at `src/components/ui/calendar.tsx`), `date-fns` v3, TanStack Query v5, Radix UI Dialog and Tabs, and Sonner toasts. The scheduling page follows the same structure as existing admin pages: AdminNav + Card layout + useQuery for reads + useMutation for writes. The week-view can be built using the existing Calendar component with custom modifiers for available, overridden, and blackout days.

**Primary recommendation:** Use a three-table schema (`availability_slots`, `availability_overrides`, `blackout_dates`), a single GET edge function that computes availability at query time, and the existing Calendar component with custom modifiers for the admin UI. Wire the Vapi tool using the `function` type with a server URL pointing to the edge function.

---

## Standard Stack

### Core (all already in the project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-day-picker` | 8.10.1 | Calendar UI with day modifiers | Already installed, Shadcn Calendar wraps it |
| `date-fns` | 3.6.0 | Date manipulation and formatting | Already installed, used throughout admin pages |
| `@tanstack/react-query` | 5.56.2 | Server state, query + mutation | Already installed, every admin page uses it |
| `@supabase/supabase-js` | 2.86.0 (client) / 2.45.0 (edge) | Database reads/writes | Existing project standard |
| `lucide-react` | 0.462.0 | Icons (Calendar, X, Plus) | Already installed |
| `sonner` | 1.5.0 | Toast notifications | Already installed, used project-wide |

### No New Installs Required

All libraries needed for this phase are already installed. No `npm install` step is needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom day-of-week table | Pre-populate a row per future date | Pre-population requires a cron job to extend; day-of-week table is perpetual |
| react-day-picker modifiers | react-big-calendar or FullCalendar | Those libraries add ~200KB and a new paradigm; react-day-picker already wraps the Shadcn Calendar component |
| Compute availability at query time | Store availability as materialized rows | Materialized approach needs sync on every admin change; query-time computation is simpler and always accurate |

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase follow existing project conventions:

```
supabase/
  migrations/
    20260303200000_availability_slots.sql      # SCHED-01: slots + overrides tables
    20260303200001_blackout_dates.sql          # SCHED-02: blackout dates table
  functions/
    availability-check/
      index.ts                                 # SCHED-04: GET edge function

src/
  pages/admin/
    Scheduling.tsx                             # SCHED-03: admin scheduling page
  hooks/
    useAvailability.ts                         # TanStack Query hooks for scheduling data
```

### Pattern 1: Two-Table Availability Schema

**What:** Separate recurring defaults from date-specific overrides. The edge function merges them at runtime.

**When to use:** When admin needs to set "open Monday through Friday by default" but also "closed December 25" or "open Saturday December 20 (extra day)."

```sql
-- availability_slots: recurring weekly defaults
-- day_of_week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches EXTRACT(DOW FROM date))
CREATE TABLE public.availability_slots (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL,

  day_of_week  smallint    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   time        NOT NULL,  -- e.g. '08:00'
  end_time     time        NOT NULL,  -- e.g. '17:00'
  is_active    boolean     NOT NULL DEFAULT true,

  -- optional: different slots per service type (NULL = applies to all)
  service_type text
);

-- availability_overrides: date-specific exceptions (add or remove availability)
CREATE TABLE public.availability_overrides (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL,

  override_date date       NOT NULL,
  is_available  boolean    NOT NULL,  -- true = added availability, false = removed
  note          text,
  service_type  text
);

-- blackout_dates: full-day blocks with a reason
CREATE TABLE public.blackout_dates (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now() NOT NULL,

  blackout_date date       NOT NULL UNIQUE,
  reason        text       NOT NULL,
  -- reason examples: 'weather_hold', 'holiday', 'maintenance', 'personal'
  created_by    uuid       REFERENCES auth.users(id)
);
```

**Key insight for the edge function query:**

```typescript
// Pseudocode for availability computation in the edge function:
// 1. Generate all dates in the requested range
// 2. For each date: check if day_of_week has an active slot OR there is a positive override
// 3. Remove any date that has a negative override OR appears in blackout_dates
// 4. Return remaining dates as open
```

### Pattern 2: Edge Function for Availability Check

**What:** A GET endpoint that computes open dates from the three tables. Follows the existing `pricing-lookup` pattern.

**When to use:** Called by the Vapi bot mid-conversation via tool call, and potentially by the admin UI to display current state.

```typescript
// Source: Matches intake-lead and pricing-lookup patterns in this project
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Query params: ?service_type=re_basic&start_date=2026-03-10&end_date=2026-03-24
export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const url = new URL(req.url);
  const serviceType = url.searchParams.get('service_type');  // optional filter
  const startDate = url.searchParams.get('start_date');       // required: YYYY-MM-DD
  const endDate = url.searchParams.get('end_date');           // required: YYYY-MM-DD

  // ... validate dates, create supabase client, query tables, compute open dates
  // Return: { available_dates: ['2026-03-10', '2026-03-11', ...] }
}

serve(handleRequest);
```

### Pattern 3: Admin Scheduling Page (React + Shadcn)

**What:** Admin page following the same structure as existing pages (AdminNav + Card + useQuery/useMutation).

**When to use:** Admin needs to see the week view and toggle day availability or add blackout dates.

```typescript
// Source: Follows QuoteRequests.tsx and DroneJobs.tsx patterns
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import AdminNav from './components/AdminNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// The Calendar component already uses DayPicker from react-day-picker v8.
// Use modifiers to color-code days:
//   available: day_of_week has an active slot and no blackout
//   blackout: appears in blackout_dates
//   override_off: has a negative override
//   override_on: has a positive override on a normally-closed day

const modifiers = {
  available: availableDates,      // Date[]
  blackout: blackoutDates,        // Date[]
  overrideOff: overrideOffDates,  // Date[]
  overrideOn: overrideOnDates,    // Date[]
};

const modifiersClassNames = {
  available: 'bg-green-100 text-green-800',
  blackout: 'bg-red-100 text-red-600 line-through',
  overrideOff: 'bg-orange-100 text-orange-700',
  overrideOn: 'bg-blue-100 text-blue-700',
};
```

### Pattern 4: Vapi Tool Call for Availability

**What:** A custom tool defined in the Vapi assistant configuration that calls the edge function.

**When to use:** Bot needs to check availability mid-conversation before offering dates to caller.

```json
// Source: https://docs.vapi.ai/tools/custom-tools
// Add this tool to the Vapi assistant configuration (via Phase 2 config update)
{
  "type": "function",
  "function": {
    "name": "check_availability",
    "description": "Check which dates are open for scheduling a drone job. Call this when the caller asks about availability or wants to book a specific date. Returns a list of available dates in the next 14 days.",
    "parameters": {
      "type": "object",
      "properties": {
        "service_type": {
          "type": "string",
          "description": "The service package type. One of: re_basic, re_standard, re_premium, construction, commercial, inspection"
        },
        "start_date": {
          "type": "string",
          "description": "Start of the date range to check, in YYYY-MM-DD format"
        },
        "end_date": {
          "type": "string",
          "description": "End of the date range to check, in YYYY-MM-DD format"
        }
      },
      "required": ["start_date", "end_date"]
    }
  },
  "server": {
    "url": "https://<project-ref>.supabase.co/functions/v1/availability-check"
  }
}
```

**Important:** The Vapi tool response must be a plain string or simple JSON. The edge function should return a human-readable string like `"Available dates: Monday March 10, Tuesday March 11, Thursday March 13"` in addition to the structured `available_dates` array, so the bot can read it naturally.

### Anti-Patterns to Avoid

- **Storing one row per future date:** Pre-populating a table with "March 10, 2026 is open" requires a cron job to extend indefinitely. The day-of-week defaults approach is perpetual and requires no maintenance.
- **Storing availability as a bitmask per week:** Hard to query, impossible to override per date, brittle when business changes hours.
- **Returning timestamps instead of dates from the edge function:** The Vapi bot needs dates it can say aloud ("Monday March 10"). Return ISO date strings and a human-readable label.
- **Mutating slots from within the edge function:** The availability edge function is read-only. All mutations go through the admin UI directly to the Supabase client.
- **Adding service_type as a required filter before you have service-specific slots:** Start with NULL meaning "applies to all" and add service-specific slots only if the business actually sets different availability per service type.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range generation | Loop in TypeScript generating Date objects | PostgreSQL `generate_series(start::date, end::date, '1 day'::interval)` in a SQL function OR iterate in Deno with date-fns `eachDayOfInterval` | generate_series or date-fns handles edge cases including leap years and DST correctly |
| Calendar display with colored days | Custom calendar grid with CSS grid | Existing `Calendar` component at `src/components/ui/calendar.tsx` with `modifiers` and `modifiersClassNames` | Component already exists in the project, follows Shadcn conventions |
| Date formatting for bot response | Custom formatter | `date-fns` `format(date, 'EEEE MMMM d')` (already installed) | Handles locale-aware day names |
| Availability state management | Local useState + fetch calls | TanStack Query useQuery + useMutation (already in project) | Handles cache invalidation, loading states, optimistic updates |

**Key insight:** The Calendar component already exists at `src/components/ui/calendar.tsx`. The scheduling page does not need a new calendar library. It needs data fed into the existing component's `modifiers` and `modifiersClassNames` props.

---

## Common Pitfalls

### Pitfall 1: Day-of-Week Integer Alignment

**What goes wrong:** PostgreSQL `EXTRACT(DOW FROM date)` returns 0 for Sunday, 1 for Monday, through 6 for Saturday. JavaScript `Date.getDay()` uses the same convention. But `date-fns` `getDay()` also matches. The risk is if any part of the stack uses a 1-based Sunday or Monday-based numbering.

**Why it happens:** Different calendar systems use different conventions. ISO 8601 treats Monday as day 1. PostgreSQL DOW treats Sunday as 0.

**How to avoid:** Store `day_of_week` using the PostgreSQL DOW convention (0=Sunday through 6=Saturday) and document it with a CHECK constraint and a comment. Use `EXTRACT(DOW FROM date)` in SQL queries and `getDay()` in JavaScript. Add a comment to the migration.

**Warning signs:** Availability appears shifted by one day (e.g., Tuesday appears as Monday).

### Pitfall 2: Timezone Mismatch in Date Comparisons

**What goes wrong:** The edge function receives `start_date=2026-03-10` but the bot or n8n is running in UTC while the business operates in Eastern Time (UTC-5). A date that is "March 10" in Hampton Roads is "March 11" in UTC if called after 7pm Eastern.

**Why it happens:** Dates without time components are ambiguous when the caller and the system are in different timezones.

**How to avoid:** The edge function works exclusively with `date` type columns (not `timestamptz`). Store `blackout_date` and `override_date` as `date`, not `timestamp`. The client (admin UI or Vapi bot) passes dates in `YYYY-MM-DD` format representing the local business date. Do not convert to UTC before storing or querying.

**Warning signs:** A blackout on "March 10" appears to not apply when queried from the bot.

### Pitfall 3: Vapi Tool Response Not Readable Aloud

**What goes wrong:** The bot calls the availability endpoint and gets back `{"available_dates": ["2026-03-10", "2026-03-11"]}` but then says "I found 2026-03-10" instead of "Monday March 10th."

**Why it happens:** The LLM needs human-readable strings to speak naturally. Raw ISO dates sound robotic.

**How to avoid:** Return both the structured array and a pre-formatted string from the edge function:

```json
{
  "available_dates": ["2026-03-10", "2026-03-11"],
  "readable_dates": "Monday March 10 and Tuesday March 11",
  "count": 2
}
```

The system prompt should instruct the bot to use `readable_dates` when speaking to the caller.

**Warning signs:** Bot reads out ISO date strings instead of natural language dates.

### Pitfall 4: Blackout Date Uniqueness

**What goes wrong:** Admin can add duplicate blackout dates (two rows for the same date), causing confusion and redundant data.

**Why it happens:** No UNIQUE constraint on the date column.

**How to avoid:** The `blackout_dates` migration includes `blackout_date date NOT NULL UNIQUE`. The admin UI handles the case where the date already exists (show an error toast rather than silently failing).

**Warning signs:** Supabase returns a unique constraint violation when the admin tries to add a date already blacked out.

### Pitfall 5: RLS Policy Gaps

**What goes wrong:** The edge function (service role) can write to the tables but the admin UI (authenticated user) cannot read them because RLS has no admin read policy.

**Why it happens:** Copy-paste of the `leads` migration RLS pattern is correct for writes but the `has_role` function must exist. Check that it is already defined in this project.

**How to avoid:** Use the same RLS pattern as `leads` table: service_role_all policy plus admins_read policy using `has_role(auth.uid(), 'admin'::app_role)`. The availability edge function uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). The admin UI uses the anon/authenticated client, so it needs the admin read policy.

**Warning signs:** Admin page shows an empty list despite rows existing in the table.

---

## Code Examples

### Migration: availability_slots and availability_overrides

```sql
-- Source: Follows project migration pattern from 20260303100000_create_leads_table.sql

CREATE TABLE public.availability_slots (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL,

  -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  -- Matches PostgreSQL EXTRACT(DOW FROM date) and JavaScript Date.getDay()
  day_of_week  smallint    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   time        NOT NULL DEFAULT '08:00',
  end_time     time        NOT NULL DEFAULT '17:00',
  is_active    boolean     NOT NULL DEFAULT true,
  service_type text        -- NULL = applies to all service types
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.availability_slots
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_all" ON public.availability_slots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default Monday-Friday 8am-5pm slots
INSERT INTO public.availability_slots (day_of_week, start_time, end_time)
VALUES (1, '08:00', '17:00'),
       (2, '08:00', '17:00'),
       (3, '08:00', '17:00'),
       (4, '08:00', '17:00'),
       (5, '08:00', '17:00');

COMMENT ON TABLE public.availability_slots IS 'Recurring weekly availability defaults. day_of_week follows PostgreSQL DOW convention: 0=Sunday, 6=Saturday.';
```

### Migration: blackout_dates

```sql
-- Source: Follows project migration pattern

CREATE TABLE public.blackout_dates (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,

  blackout_date date        NOT NULL UNIQUE,
  reason        text        NOT NULL,
  -- Suggested reason values: weather_hold | holiday | maintenance | personal
  created_by    uuid        REFERENCES auth.users(id)
);

ALTER TABLE public.blackout_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.blackout_dates
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_all" ON public.blackout_dates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_blackout_dates_date
  ON public.blackout_dates (blackout_date);

COMMENT ON TABLE public.blackout_dates IS 'Full-day availability blocks. Dates in this table are excluded from all availability calculations.';
```

### Edge Function: Availability Check

```typescript
// Source: Follows pricing-lookup/index.ts pattern in this project
// Function: GET /availability-check?service_type=re_basic&start_date=2026-03-10&end_date=2026-03-24

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

// Format a date as "Monday March 10"
function formatReadable(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC to avoid edge-of-day timezone issues
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

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
  const activeDays = new Set((slots ?? []).map((s: { day_of_week: number }) => s.day_of_week));

  // Fetch overrides in range
  const { data: overrides } = await supabase
    .from('availability_overrides')
    .select('override_date, is_available')
    .gte('override_date', startDate)
    .lte('override_date', endDate);

  // Fetch blackout dates in range
  const { data: blackouts } = await supabase
    .from('blackout_dates')
    .select('blackout_date')
    .gte('blackout_date', startDate)
    .lte('blackout_date', endDate);

  const blackoutSet = new Set((blackouts ?? []).map((b: { blackout_date: string }) => b.blackout_date));
  const overrideMap = new Map<string, boolean>();
  for (const o of (overrides ?? [])) {
    overrideMap.set(o.override_date, o.is_available);
  }

  // Generate all dates in range and filter
  const availableDates: string[] = [];
  const current = new Date(startDate + 'T12:00:00Z');
  const end = new Date(endDate + 'T12:00:00Z');

  while (current <= end) {
    const isoDate = current.toISOString().slice(0, 10);
    const dow = current.getUTCDay(); // 0=Sun, matches PostgreSQL DOW

    if (!blackoutSet.has(isoDate)) {
      if (overrideMap.has(isoDate)) {
        if (overrideMap.get(isoDate) === true) availableDates.push(isoDate);
      } else if (activeDays.has(dow)) {
        availableDates.push(isoDate);
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  const readableDates = availableDates.map(formatReadable);
  const readableString = readableDates.length > 0
    ? readableDates.join(', ')
    : 'No dates are currently available in that range';

  return json({
    available_dates: availableDates,
    readable_dates: readableString,
    count: availableDates.length,
  });
}

serve(handleRequest);
```

### Admin Page: useAvailability Hook

```typescript
// Source: Follows TanStack Query v5 patterns used in existing admin pages
// File: src/hooks/useAvailability.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAvailabilitySlots() {
  return useQuery({
    queryKey: ['availability_slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .order('day_of_week');
      if (error) throw error;
      return data;
    },
  });
}

export function useBlackoutDates(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['blackout_dates', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blackout_dates')
        .select('*')
        .gte('blackout_date', startDate)
        .lte('blackout_date', endDate)
        .order('blackout_date');
      if (error) throw error;
      return data;
    },
  });
}

export function useAddBlackoutDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { blackout_date: string; reason: string }) => {
      const { error } = await supabase.from('blackout_dates').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blackout_dates'] }),
  });
}
```

### react-day-picker v8 Modifiers for Scheduling UI

```typescript
// Source: https://daypicker.dev/v8/advanced-guides/custom-modifiers
// Used inside src/pages/admin/Scheduling.tsx

import { Calendar } from '@/components/ui/calendar';

// Convert ISO date strings from Supabase to Date objects for modifiers
const availableDays = availableDates.map(d => new Date(d + 'T12:00:00'));
const blackoutDays = blackoutDates.map(d => new Date(d.blackout_date + 'T12:00:00'));

<Calendar
  mode="single"
  selected={selectedDate}
  onSelect={setSelectedDate}
  modifiers={{
    available: availableDays,
    blackout: blackoutDays,
  }}
  modifiersClassNames={{
    available: 'bg-green-100 rounded-md',
    blackout: 'bg-red-100 text-red-600 opacity-75',
  }}
  disabled={(date) => date < new Date()}
/>
```

### AdminNav Addition

```typescript
// Add to navCategories in src/pages/admin/components/AdminNav.tsx
// Inside the "Intake" or "Missions" category (or create "Operations" category)
{ href: '/admin/scheduling', label: 'Scheduling', icon: CalendarDays },
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vapi custom `functions` (deprecated) | Vapi tool type `function` with `server` URL | Late 2024 | Custom functions are deprecated; use the tool schema shown above |
| react-day-picker v7 class-based API | react-day-picker v8 prop-based modifiers | v8 released 2023 | Project is already on v8 (react-day-picker 8.10.1), use `modifiers` prop not `dayClassName` |
| TanStack Query v4 `onSuccess` in options | TanStack Query v5 callbacks moved to `useMutation` | v5 released Oct 2023 | Project is on v5 (5.56.2); do NOT use `onSuccess` in `useQuery` options |

**Deprecated/outdated:**
- `dayClassName` prop in react-day-picker: replaced by `modifiersClassNames` in v8
- Vapi `functions` property on assistant config: replaced by `tools` array with `type: "function"` entries
- TanStack Query v4 `onSuccess`/`onError` in query options: not available in v5, use `useMutation` callbacks instead

---

## Open Questions

1. **Service-type-specific availability**
   - What we know: The schema includes an optional `service_type` column on `availability_slots` and `availability_overrides`
   - What's unclear: The business may not need different hours for different service types (all jobs are full-day outdoor work)
   - Recommendation: Seed the default slots with `service_type = NULL` (applies to all). Add service-type filtering to the edge function but do not build UI for it in Phase 4. If needed, add it in a later phase.

2. **Availability overrides table: needed in MVP or Wave 0 gap?**
   - What we know: SCHED-01 says "date-specific overrides." This implies the admin can mark a normally-closed day as open or a normally-open day as closed for a specific date.
   - What's unclear: Whether the admin UI in Phase 4 needs full override editing or just blackout dates
   - Recommendation: Create the `availability_overrides` table in the migration (schema completeness), expose blackout date management in the Phase 4 UI. Deferred overrides UI (for adding extra open days) is a natural extension in Phase 5 or 6.

3. **Vapi tool auth for availability endpoint**
   - What we know: The `pricing-lookup` edge function is open (no auth header required). The `availability-check` function can follow the same pattern since it returns no sensitive data.
   - What's unclear: Whether the Vapi `server.url` can include a custom header (e.g., a shared secret)
   - Recommendation: Make the `availability-check` endpoint publicly readable (anon key in header or no auth). It returns only dates, not personal data. Document this decision. If auth is needed later, add a shared secret query param.

---

## Sources

### Primary (HIGH confidence)
- Project codebase (`supabase/functions/intake-lead/index.ts`, `supabase/functions/pricing-lookup/index.ts`) - Deno + CORS + serve() edge function pattern
- Project codebase (`src/components/ui/calendar.tsx`) - react-day-picker v8 Calendar component already in project
- Project codebase (`package.json`) - All required libraries confirmed installed
- Project codebase (`supabase/migrations/20260303100000_create_leads_table.sql`) - RLS pattern with `has_role`, service_role_all policy
- [Vapi Custom Tools docs](https://docs.vapi.ai/tools/custom-tools) - Tool schema with `type: "function"` and `server.url`

### Secondary (MEDIUM confidence)
- [react-day-picker v8 custom modifiers](https://daypicker.dev/v8/advanced-guides/custom-modifiers) - `modifiers` and `modifiersClassNames` API verified against project's installed version
- [Vapi Default Tools docs](https://docs.vapi.ai/tools/default-tools) - apiRequest and function tool types confirmed current
- [Managing Calendar Availability in Supabase](https://dev.to/ivaaan/managing-calendar-availability-in-supabase-307d) - `generate_series` for date population (informed the edge function date loop approach)

### Tertiary (LOW confidence)
- Community discussion on appointment scheduling table design - informed the two-table schema pattern; not from official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries confirmed installed in `package.json`; versions verified
- Architecture: HIGH - Edge function pattern directly observed from existing `pricing-lookup` and `intake-lead` functions; schema pattern from first principles with PostgreSQL DOW convention verified
- Vapi tool call: MEDIUM - Tool schema verified from official Vapi docs; specific behavior of the bot reading `readable_dates` is a design recommendation, not an observed behavior
- Pitfalls: HIGH - Timezone and day-of-week alignment pitfalls verified from PostgreSQL and JavaScript documentation; RLS pitfall observed directly in project migration patterns

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days; react-day-picker and Supabase are stable, Vapi tool schema may shift faster)
