# 04-02 Summary: Admin Scheduling Page

**Status:** Complete (pending browser verification)
**Date:** 2026-03-03

## What Was Done

### useAvailability.ts (6 hooks)
Created `src/hooks/useAvailability.ts` with TanStack Query v5 hooks:
- `useAvailabilitySlots()` fetches all slots ordered by day_of_week
- `useBlackoutDates(start, end)` fetches blackout dates in range
- `useAvailabilityOverrides(start, end)` fetches overrides in range
- `useAddBlackoutDate()` inserts blackout with toast feedback, unique constraint handling
- `useRemoveBlackoutDate()` deletes blackout by id
- `useToggleSlot()` updates is_active on a slot

All hooks use `as never` cast for table names since these tables are new and Supabase generated types have not been regenerated.

### Scheduling.tsx
Created `src/pages/admin/Scheduling.tsx` with two tabs:

**Calendar tab:** Shadcn Calendar with 2-month view and color-coded modifiers:
- Green: available weekdays (from active slots)
- Red with strikethrough: blackout dates
- Blue: extra open days (positive overrides)
- Orange: override closed days (negative overrides)
- Legend below calendar explaining colors
- Click a date to open a Dialog for adding/removing blackout
- Blackout dialog has reason selector (weather hold, holiday, maintenance, personal, custom)
- Past dates show as disabled

**Weekly Slots tab:** List of 7 days with Switch toggles for active/inactive. Shows start_time and end_time for configured slots. Days without slots show "No slot configured."

### AdminNav and Router
- Added CalendarDays icon and "Scheduling" link as first item in Operations category
- Added lazy import and `/admin/scheduling` route in App.tsx

## Verification
- TypeScript compiles clean (`npx tsc --noEmit`)
- Vite production build passes
- Browser verification pending (Task 3 checkpoint)

## Files Created/Modified
- `src/hooks/useAvailability.ts` (new)
- `src/pages/admin/Scheduling.tsx` (new)
- `src/pages/admin/components/AdminNav.tsx` (modified: added CalendarDays import, Scheduling nav item)
- `src/App.tsx` (modified: added lazy import and route)
