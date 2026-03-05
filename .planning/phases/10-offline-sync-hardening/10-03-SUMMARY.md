---
phase: 10-offline-sync-hardening
plan: 03
subsystem: ui
tags: [react, indexeddb, dead-letter, banner, hooks, vitest, testing-library]

requires:
  - phase: 10-01
    provides: "Dead letter store CRUD helpers (getDeadLetterCount, retryDeadLetterItems) in db.ts"
  - phase: 10-02
    provides: "Sync engine with onSyncStatusChange listener and processQueue"
provides:
  - "DeadLetterBanner component for pilot visibility into stuck sync items"
  - "useDeadLetterCount hook with auto refresh on sync status changes"
  - "PilotDashboard integration rendering dead letter warning"
affects: [pilot-ui, offline-sync]

tech-stack:
  added: ["@testing-library/react", "@testing-library/jest-dom", "@testing-library/user-event"]
  patterns: ["TDD for React components with vitest + testing-library"]

key-files:
  created:
    - src/components/pilot/DeadLetterBanner.tsx
    - src/components/pilot/DeadLetterBanner.spec.tsx
    - src/hooks/useDeadLetterCount.ts
  modified:
    - src/pages/pilot/PilotDashboard.tsx

key-decisions:
  - "Installed @testing-library/react for component TDD (was missing from devDependencies)"
  - "Banner placed after PilotCard and before QuickActions for maximum visibility"

patterns-established:
  - "React component TDD with vitest + @testing-library/react in jsdom environment"

requirements-completed: [SYNC-02]

duration: 2min
completed: 2026-03-05
---

# Phase 10 Plan 03: Dead Letter Banner Summary

**DeadLetterBanner component with count display, Retry All button, and useDeadLetterCount hook that auto refreshes on sync cycle completion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T18:20:31Z
- **Completed:** 2026-03-05T18:22:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- DeadLetterBanner renders destructive alert with item count and Retry All button
- Banner returns null when count is 0 for zero visual noise in normal operation
- useDeadLetterCount hook refreshes count on every sync status change
- Retry All moves dead letter items back to sync queue and triggers immediate processQueue
- PilotDashboard renders the banner after the pilot card
- All 24 tests pass across sync and banner test suites

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests** - `7e727f7` (test)
2. **Task 1 GREEN: Implement component and hook** - `42151f5` (feat)
3. **Task 2: Wire into PilotDashboard** - `468b642` (feat)

## Files Created/Modified
- `src/components/pilot/DeadLetterBanner.tsx` - Warning banner with count and Retry All button
- `src/components/pilot/DeadLetterBanner.spec.tsx` - 5 unit tests for banner behavior
- `src/hooks/useDeadLetterCount.ts` - Hook tracking dead letter count with sync status subscription
- `src/pages/pilot/PilotDashboard.tsx` - Added DeadLetterBanner import and render

## Decisions Made
- Installed @testing-library/react, @testing-library/jest-dom, and @testing-library/user-event as dev dependencies. The project had vitest and jsdom but no React testing utilities. This was a blocking dependency for TDD component tests.
- Placed the banner after PilotCard and before QuickActions in the dashboard layout for maximum visibility without disrupting the mission workflow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @testing-library packages**
- **Found during:** Task 1 (test infrastructure check)
- **Issue:** @testing-library/react not in devDependencies, required for component TDD
- **Fix:** Ran npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
- **Files modified:** package.json, package-lock.json
- **Verification:** Tests run and pass with render/screen/fireEvent
- **Committed in:** 42151f5 (part of Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for TDD workflow. No scope creep.

## Issues Encountered
None

## User Setup Required
None

## Next Phase Readiness
- Dead letter banner is live in the pilot dashboard
- All sync hardening components (Plan 01 db helpers, Plan 02 engine hardening, Plan 03 UI visibility) are complete
- Phase 10 offline sync hardening is fully implemented

---
*Phase: 10-offline-sync-hardening*
*Completed: 2026-03-05*
