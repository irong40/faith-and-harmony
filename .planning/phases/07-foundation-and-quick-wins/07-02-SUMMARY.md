---
phase: 07-foundation-and-quick-wins
plan: 02
subsystem: ui, payments
tags: [react, square, pwa, canvas, vitest]

# Dependency graph
requires:
  - phase: none
    provides: existing QuoteBuilder and create-deposit-invoice edge function
provides:
  - 50% deposit calculation in QuoteBuilder and Square invoice
  - Sentinel branded PWA icons at 192x192 and 512x512
affects: [09-billing-lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD for business logic fixes (QuoteBuilder deposit calculation)
    - Canvas API for programmatic icon generation

key-files:
  created:
    - src/pages/admin/components/QuoteBuilder.spec.tsx
  modified:
    - src/pages/admin/components/QuoteBuilder.tsx
    - supabase/functions/create-deposit-invoice/index.ts
    - public/pwa-192x192.png
    - public/pwa-512x512.png

key-decisions:
  - "Used canvas npm package to generate branded PWA icons programmatically rather than manual design tools"

patterns-established:
  - "TDD for business rule fixes: write test capturing wrong behavior first, then fix"

requirements-completed: [BILL-01, DEPLOY-01]

# Metrics
duration: ~20min
completed: 2026-03-05
---

# Phase 7 Plan 02: Deposit Fix and PWA Icons Summary

**Deposit percentage corrected from 25% to 50% across QuoteBuilder and Square invoice edge function, with Sentinel branded PWA icons replacing SVG placeholders**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3 (2 implementation + 1 human verification)
- **Files modified:** 5

## Accomplishments
- Fixed deposit calculation from 25% to 50% in QuoteBuilder with all related UI text updated
- Updated Square invoice edge function description and line item name to reflect 50% deposit
- Generated Sentinel branded PWA icons (purple background, gold S) at 192x192 and 512x512
- Added QuoteBuilder spec file with tests covering deposit percentage calculation and display text
- Deployed updated create-deposit-invoice edge function

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix deposit percentage from 25% to 50%** - `765019c` (test: failing tests), `8545efd` (fix: implementation)
2. **Task 2: Replace PWA icons with Sentinel branded PNGs** - `ae88f36` (feat: icon replacement)
3. **Task 3: Verify deposit fix and PWA icons** - Human checkpoint, approved

## Files Created/Modified
- `src/pages/admin/components/QuoteBuilder.spec.tsx` - Tests for 50% deposit calculation and display text
- `src/pages/admin/components/QuoteBuilder.tsx` - Changed 0.25 to 0.5 and all "25%" text to "50%"
- `supabase/functions/create-deposit-invoice/index.ts` - Updated invoice description and line item from "25%" to "50%"
- `public/pwa-192x192.png` - Sentinel branded icon (purple background, gold S)
- `public/pwa-512x512.png` - Sentinel branded icon (purple background, gold S)

## Decisions Made
- Used canvas npm package to generate branded PWA icons programmatically rather than manual design tools

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None. No external service configuration required.

## Next Phase Readiness
- Phase 7 is now complete (both plans 07-01 and 07-02 done)
- Deposit fix ensures Phase 9 (Billing Lifecycle) starts with correct amounts
- PWA icons are production ready for Phase 11 standalone deployment

---
*Phase: 07-foundation-and-quick-wins*
*Completed: 2026-03-05*

## Self-Check: PASSED
All 5 files verified present. All 3 commit hashes verified in git log.
