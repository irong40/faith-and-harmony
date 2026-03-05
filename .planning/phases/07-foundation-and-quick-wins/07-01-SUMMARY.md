---
phase: 07-foundation-and-quick-wins
plan: 01
subsystem: ui
tags: [react, supabase, shadcn, fleet-management, admin-crud, plpgsql]

requires:
  - phase: v1.1-complete
    provides: Fleet management tables, hooks, and types (accessories, aircraft, mission_equipment)
provides:
  - Admin accessories CRUD page at /admin/accessories
  - Safe deletion database function (delete_accessory_safe)
  - Aircraft multi-select in admin accessory form
  - Admin AccessoryFormDialog component
affects: [mission-equipment, fleet-management, admin-portal]

tech-stack:
  added: []
  patterns: [database-function-guard-for-array-fk, admin-crud-page-with-fleet-hooks]

key-files:
  created:
    - supabase/migrations/20260305500000_delete_accessory_safe.sql
    - src/pages/admin/Accessories.tsx
    - src/components/admin/AccessoryFormDialog.tsx
    - src/pages/admin/Accessories.spec.tsx
    - src/hooks/useFleetMutations.spec.ts
    - src/components/admin/AccessoryFormDialog.spec.tsx
  modified:
    - src/hooks/useFleetMutations.ts
    - src/pages/admin/components/AdminNav.tsx
    - src/App.tsx

key-decisions:
  - "Database function for deletion guard instead of application-level check, prevents deletion from any client"
  - "Admin form uses checkbox multi-select from aircraft table, pilot form unchanged for offline compatibility"
  - "compatible_aircraft stored as text array of model names, not UUIDs, to preserve existing EquipmentSelector filtering"

patterns-established:
  - "Safe deletion via Supabase RPC: check array column references before DELETE, raise exception if found"
  - "Admin CRUD pages reuse fleet query/mutation hooks from pilot portal"

requirements-completed: [EQUIP-01, EQUIP-02, EQUIP-03]

duration: 4min
completed: 2026-03-05
---

# Phase 7 Plan 01: Admin Accessories CRUD Summary

**Admin accessories page with safe deletion guard, aircraft checkbox multi-select, and full CRUD using existing fleet hooks**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T18:13:37Z
- **Completed:** 2026-03-05T18:17:55Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Admin can view, create, edit, and delete accessories from /admin/accessories
- Deletion blocked at database level when accessory is referenced by mission_equipment (raises clear error)
- Aircraft compatibility uses checkboxes populated from the aircraft table instead of freeform text
- EquipmentSelector filtering behavior preserved (EQUIP-03) with no changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Database deletion guard and admin accessories page** - `c7bd476` (feat)
2. **Task 2: Aircraft compatibility multi-select in accessory form** - `cc9f79f` (feat)

## Files Created/Modified
- `supabase/migrations/20260305500000_delete_accessory_safe.sql` - PL/pgSQL function that checks mission_equipment references before deleting
- `src/hooks/useFleetMutations.ts` - useDeleteAccessory now calls RPC instead of direct table delete
- `src/pages/admin/Accessories.tsx` - Admin page with table, CRUD actions, delete confirmation dialog
- `src/components/admin/AccessoryFormDialog.tsx` - Form dialog with aircraft checkbox multi-select
- `src/pages/admin/components/AdminNav.tsx` - Added Accessories under Missions category
- `src/App.tsx` - Added /admin/accessories route with lazy import
- `src/hooks/useFleetMutations.spec.ts` - Tests verifying RPC integration pattern
- `src/pages/admin/Accessories.spec.tsx` - Tests for page data flow and error handling
- `src/components/admin/AccessoryFormDialog.spec.tsx` - Tests for checkbox UI and array storage

## Decisions Made
- Used database function (SECURITY DEFINER) for deletion guard instead of application check. This prevents any client from deleting referenced accessories, not just the admin UI.
- Admin form gets multi-select checkboxes, pilot form stays with freeform text input for offline compatibility.
- Kept compatible_aircraft as text array of model names (not UUIDs) to preserve existing EquipmentSelector filtering.

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None. The migration needs to be applied to production via `supabase db push` or `supabase migration up`.

## Next Phase Readiness
- Admin accessories management complete
- Fleet management admin tooling expanded
- Ready for remaining Phase 7 plans (PWA icons, deposit fix)

---
*Phase: 07-foundation-and-quick-wins*
*Completed: 2026-03-05*
