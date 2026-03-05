---
phase: 01-seo-foundation
plan: 02
subsystem: ui
tags: [json-ld, structured-data, schema-org, seo, react, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: LandingPageHelmet rendered as first child in LandingPage.tsx, landing-page div structure established
provides:
  - LandingPageJsonLd component with LocalBusiness, Service @graph, and FAQPage JSON-LD schemas
  - Three script[type="application/ld+json"] tags rendered in the landing page DOM
  - All 6 service packages with locked pricing in Service schema
  - Real FAQ content wired into FAQPage schema (10 questions from FAQSection)
affects:
  - 01-03-seo-foundation (sitemap/robots, OG already done in 01-01)
  - 04-XX (Phase 4 FAQ content plan will populate additional questions via FAQSection)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline script tags with dangerouslySetInnerHTML for JSON-LD (not react-helmet-async)
    - JSON-LD schemas defined as module-level constants outside the component function
    - Dynamic FAQPage schema built inside the component from imported FAQ_ITEMS constant
    - Service schemas collected in @graph array for efficient Google processing

key-files:
  created:
    - src/components/seo/LandingPageJsonLd.tsx
  modified:
    - src/pages/LandingPage.tsx

key-decisions:
  - "FAQPage schema uses real FAQ_ITEMS from FAQSection instead of placeholder stub questions, so the schema is populated at launch without a Phase 4 replacement step"
  - "JSON-LD built with dangerouslySetInnerHTML and JSON.stringify on plain objects, not react-helmet-async, to keep script tags in the component tree rather than document head"
  - "Service schemas collected in a single @graph block for all 6 packages"

patterns-established:
  - "JSON-LD schemas: module-level constants for static data, function body for dynamic data derived from other components"
  - "FAQSection exports FAQ_ITEMS as named export so both the UI section and the JSON-LD component share a single source of truth"

requirements-completed: [SEO-06, SEO-07, SEO-08]

# Metrics
duration: 0min
completed: 2026-02-26
---

# Phase 1 Plan 02: JSON-LD Structured Data Summary

**LocalBusiness, 6 Service schemas in @graph, and FAQPage with 10 real questions rendered as inline JSON-LD script tags on the landing page**

## Performance

- **Duration:** Pre-executed (work done in prior session commit 2a64a40)
- **Started:** 2026-02-26T23:47:57Z
- **Completed:** 2026-02-26T23:48:30Z
- **Tasks:** 2 (verified complete, code pre-existing)
- **Files modified:** 2

## Accomplishments

- LandingPageJsonLd renders three script[type="application/ld+json"] tags using dangerouslySetInnerHTML with JSON.stringify
- LocalBusiness schema includes name "Sentinel Aerial Inspections", telephone "+17605754876", email "contact@sentinelaerial.com", Virginia Beach address, 10 areaServed entries, FAA credentials, and founder Dr. Adam Pierce
- Service @graph includes all 6 packages at locked canonical prices ($225, $450, $750, $450, $850, $1,200)
- FAQPage schema imports FAQ_ITEMS from FAQSection and maps 10 real question/answer pairs dynamically, eliminating the placeholder stub approach from the plan
- Component renders as second child in LandingPage.tsx, immediately after LandingPageHelmet

## Task Commits

All work was completed in a single prior-session commit before GSD tracking was initialized for this project:

1. **Task 1: Create LandingPageJsonLd with LocalBusiness and Service schemas** - `2a64a40` (feat)
2. **Task 2: Wire LandingPageJsonLd into LandingPage** - `2a64a40` (feat)

Note: Both tasks were committed together in commit `2a64a40 feat: implement landing page phases 1-4 (SEO, images, content, below-fold)` before the GSD planning system was initialized for this project. The work satisfies all success criteria in the plan.

## Files Created/Modified

- `src/components/seo/LandingPageJsonLd.tsx` - Three JSON-LD schemas: LocalBusiness identity, Service @graph with 6 packages, and FAQPage with dynamic FAQ content from FAQSection
- `src/pages/LandingPage.tsx` - LandingPageJsonLd imported and rendered as second child after LandingPageHelmet

## JSON-LD Block Structure

### Script 1: LocalBusiness

Key fields: name, alternateName, description, url, telephone, email, priceRange, PostalAddress (Virginia Beach VA), areaServed (10 locations), hasCredential (FAA Part 107, LAANC, $1M insurance), foundingDate 2026, founder Dr. Adam Pierce.

### Script 2: Service @graph

Six Service entries, each with name, description, provider reference, and Offer with price and USD currency:

| Service | Price |
| Listing Lite Aerial Photography | $225 |
| Listing Pro Aerial Photography | $450 |
| Luxury Listing Aerial Photography | $750 |
| Construction Progress Monitoring | $450 |
| Commercial Marketing Package | $850 |
| Inspection Data Package | $1,200 |

### Script 3: FAQPage

Built dynamically from FAQ_ITEMS exported by FAQSection. The component imports the constant and maps it to Question/Answer pairs. 10 questions at launch covering military airspace, delivery timing, weather cancellation, service area, equipment, insurance, pricing, thermal inspection, LAANC, and coverage.

### Phase 4 FAQ Reference

The plan specified 3 placeholder FAQ pairs. The prior implementation instead used the real FAQ_ITEMS constant. These are the 3 questions closest to the plan's placeholder set:

1. "Do you need permission to fly near military bases in Hampton Roads?" (covers the LAANC/military airspace placeholder)
2. "How long does it take to get edited photos after the shoot?" (covers the delivery timing placeholder)
3. "Do you serve Virginia Beach, Chesapeake, and Norfolk?" (covers the service area placeholder)

Phase 4 can update FAQ content by editing FAQ_ITEMS in FAQSection.tsx. The JSON-LD updates automatically since LandingPageJsonLd imports the same constant.

## Decisions Made

- FAQPage schema uses real FAQ_ITEMS from FAQSection rather than the plan's placeholder stub, so Phase 4 only needs to edit one file (FAQSection.tsx) to update both the visible FAQ section and the JSON-LD schema simultaneously.
- JSON-LD uses inline script tags with dangerouslySetInnerHTML rather than react-helmet-async, keeping JSON-LD in the component tree alongside the content it describes.

## Deviations from Plan

### Implementation Differences

**1. [Pre-existing] FAQPage uses real questions instead of 3 placeholder stubs**
- **Found during:** Task 1 verification
- **Issue:** Plan specified a stub FAQPage with 3 specific placeholder Q&A pairs. The prior implementation wired FAQPage directly to FAQ_ITEMS from FAQSection, giving 10 real questions at launch.
- **Impact:** Positive. Real content produces a structurally valid, populated schema immediately. Phase 4 FAQ work is simplified to editing one source file.
- **Files modified:** src/components/seo/LandingPageJsonLd.tsx
- **Committed in:** 2a64a40

---

**Total deviations:** 1 (pre-existing, positive outcome)
**Impact on plan:** FAQ schema is stronger than planned. Phase 4 FAQ edit path is simpler. No correctness issues.

## Issues Encountered

None. All success criteria verified:
- LandingPageJsonLd.tsx exists with three distinct JSON-LD blocks
- LocalBusiness schema has correct name, telephone, and email
- Service @graph has all 6 packages at locked prices
- FAQPage has 10 real Q&A pairs (exceeds plan minimum of 2)
- Component renders as second child in LandingPage.tsx after LandingPageHelmet
- npm run typecheck passes with zero errors
- npm run build passes

## User Setup Required

None. No external service configuration required.

## Next Phase Readiness

- Plan 01-03 (sitemap, robots.txt, OG/Twitter) can proceed immediately. OG and Twitter card tags were added in plan 01-01.
- Plan 01-04 (semantic HTML audit) can proceed independently.
- Phase 4 FAQ editing: update FAQ_ITEMS array in src/components/landing/FAQSection.tsx. LandingPageJsonLd picks up changes automatically.

---
*Phase: 01-seo-foundation*
*Completed: 2026-02-26*
