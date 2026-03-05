---
phase: 04-below-fold-content
plan: 02
subsystem: ui
tags: [react, typescript, faq, json-ld, schema-org, seo, css]

# Dependency graph
requires:
  - phase: 01-seo-foundation
    provides: LandingPageJsonLd component with FAQPage stub that this plan replaces with real data
provides:
  - FAQSection component with 10 Q&A pairs rendered as a static list
  - FAQ_ITEMS shared data array that drives both visible UI and JSON-LD schema
  - FAQPage JSON-LD schema in LandingPageJsonLd generated from FAQ_ITEMS (no drift possible)
  - CSS styles for .lp-faq section in landing.css
affects: [05-performance-audit, future-content-updates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Shared data array pattern: define content once in the component, export it, import in schema component
    - Single source of truth for FAQ: FAQ_ITEMS drives both visible text and JSON-LD mainEntity

key-files:
  created:
    - src/components/landing/FAQSection.tsx
  modified:
    - src/components/seo/LandingPageJsonLd.tsx
    - src/pages/LandingPage.tsx
    - src/pages/landing.css

key-decisions:
  - "FAQ_ITEMS exported from FAQSection.tsx and imported in LandingPageJsonLd.tsx so a single edit updates both visible text and structured data simultaneously"
  - "Static list render (not accordion) keeps implementation simple and all content visible for crawlers"
  - "Prose writing constraints enforced: no dashes, no semicolons, no colons in answers, no marketing language"

patterns-established:
  - "Shared data export pattern: export const DATA_ARRAY from UI component, import in schema component"
  - "FAQ answer prose: active voice, concrete specifics, no compound adjective hyphens"

requirements-completed: [PAGE-08, SEO-08]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 4 Plan 02: FAQ Section and FAQPage Schema Summary

**10-question FAQ section with shared FAQ_ITEMS array driving both the visible static list and the FAQPage JSON-LD schema, eliminating any possibility of content drift between UI and structured data**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T01:17:55Z
- **Completed:** 2026-02-27T01:20:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- FAQSection.tsx created with 10 Q&A pairs covering LAANC authorization, turnaround times, weather policy, service area, equipment, insurance, pricing, thermal inspections, and Hampton Roads coverage
- FAQ_ITEMS exported from FAQSection.tsx and imported in LandingPageJsonLd.tsx so the FAQPage schema is always in sync with the visible content
- CSS appended to landing.css with scoped .lp-faq classes matching the existing dark military aesthetic
- All answer prose reviewed for writing constraint compliance: no dashes, no semicolons, no colons, no marketing language

## Task Commits

Both tasks were implemented in a prior bulk commit before GSD plan execution:

1. **Task 1: Create shared FAQ data and FAQSection component** - `2a64a40` (feat)
2. **Task 2: Update FAQPage schema, wire FAQSection, add CSS** - `2a64a40` (feat)

**Plan metadata:** (docs commit follows)

_Note: Implementation was pre-committed in the project initialization bulk commit `2a64a40`. All plan requirements verified against existing code. Build and typecheck both pass._

## Files Created/Modified
- `src/components/landing/FAQSection.tsx` - FAQItem type, FAQ_ITEMS array (10 items), FAQSection default export rendering static list
- `src/components/seo/LandingPageJsonLd.tsx` - Imports FAQ_ITEMS, generates faqSchema.mainEntity dynamically from the shared array
- `src/pages/LandingPage.tsx` - Imports FAQSection, renders it after MilitaryAirspace
- `src/pages/landing.css` - FAQ section styles: .lp-faq, .lp-faq-list, .lp-faq-item, .lp-faq-question, .lp-faq-answer with responsive breakpoint at 768px

## Decisions Made
- FAQ_ITEMS exported from FAQSection.tsx and imported in LandingPageJsonLd.tsx. Single edit to the array propagates to both visible content and JSON-LD schema simultaneously.
- Static list chosen over accordion. All content remains visible and indexable without JavaScript interaction.
- Prose writing constraints applied throughout: "real time" two words no dash, "survey grade" two words no dash, "built in" two words no dash, "commercial grade" two words no dash.

## Deviations from Plan

None in terms of implementation. The plan was executed exactly as specified. The implementation pre-existed in commit `2a64a40` and was verified against all plan requirements:

- FAQ_ITEMS array exports 10 items (verified)
- FAQSection is the default export (verified)
- FAQSection renders after MilitaryAirspace in LandingPage.tsx (verified)
- LandingPageJsonLd imports FAQ_ITEMS and maps to mainEntity (verified)
- CSS .lp-faq classes present in landing.css (verified at line 1233)
- Build passes, typecheck passes (verified)
- No dashes in any answer text (verified)

## Issues Encountered

None. All verification checks passed on first inspection.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- FAQ section is fully wired and rendering. The shared FAQ_ITEMS pattern is established.
- Phase 4 Plan 03 (QuoteForm) and Plan 04 (remaining sections) can proceed.
- FAQ content may need review before launch to ensure LAANC authorization status is accurate.

## Self-Check: PASSED

- FOUND: src/components/landing/FAQSection.tsx
- FOUND: src/components/seo/LandingPageJsonLd.tsx
- FOUND: src/pages/LandingPage.tsx
- FOUND: src/pages/landing.css
- FOUND: .planning/phases/04-below-fold-content/04-02-SUMMARY.md
- FOUND commit: 2a64a40 (implementation)
- FOUND commit: 4a60e21 (plan metadata)
- Build: PASSED (npm run build)
- Typecheck: PASSED (npm run typecheck)

---
*Phase: 04-below-fold-content*
*Completed: 2026-02-27*
