# 04-01 Summary: Database Migrations and Availability Check Edge Function

**Status:** Complete
**Date:** 2026-03-03

## What Was Done

### Migration 1: 20260303400000_availability_slots.sql
Created two tables in a single migration:
- **availability_slots** with day_of_week (0-6), start_time, end_time, is_active, service_type columns. RLS with service_role_all and admins_all policies. Seeded with Mon-Fri 8am-5pm defaults (5 rows).
- **availability_overrides** with override_date (date type), is_available boolean, note, service_type. Same RLS policies. Index on override_date.

### Migration 2: 20260303400001_blackout_dates.sql
Created **blackout_dates** table with blackout_date (date, UNIQUE), reason (text), created_by (FK to auth.users). Same RLS policies. Index on blackout_date.

### Edge Function: availability-check
Deployed at `/functions/v1/availability-check` with `--no-verify-jwt` (publicly readable, same pattern as pricing-lookup). Follows the exact pricing-lookup pattern (serve, CORS, json helper, exported handleRequest).

Computes open dates by:
1. Fetching active day-of-week slots (optionally filtered by service_type)
2. Fetching overrides in date range
3. Fetching blackout dates in date range
4. Iterating through date range, applying blackouts then overrides then weekly defaults

Returns `available_dates` (ISO strings), `readable_dates` (human readable for Vapi bot), and `count`.

## Verification

- GET with Mon-Fri range returns 5 weekday dates, excludes weekend
- GET with missing params returns 400
- readable_dates format: "Monday, March 9, Tuesday, March 10, ..."
- All three tables visible in Supabase dashboard with correct RLS policies

## Files Created
- `supabase/migrations/20260303400000_availability_slots.sql`
- `supabase/migrations/20260303400001_blackout_dates.sql`
- `supabase/functions/availability-check/index.ts`
