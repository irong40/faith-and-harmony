---
phase: 03-above-fold-content
plan: 02
subsystem: ui
tags: [react, typescript, css, hero-section, trust-bar, seo, cta, landing-page]

# Dependency graph
requires:
  - phase: 01-seo-foundation
    provides: LandingPage.tsx component structure and landing.css scope
  - phase: 03-01
    provides: StickyNav.tsx component and section anchor IDs with lp-hero CSS class in place
provides:
  - HeroSection.tsx component with H1 keyword phrase, subheadline, phone, and Get a Quote CTA
  - TrustBar.tsx component with four proof badges (FAA Part 107, $1M Insurance, Veteran Owned, 48 Hour Turnaround)
  - landing.css hero sub-element styles (.lp-hero__headline, .lp-hero__sub, .lp-hero__actions, .lp-hero__phone)
  - landing.css trust bar styles (.lp-trust-bar and all child selectors)
  - LandingPage.tsx header logo changed from h1 to div.lp-logo-heading (single H1 is now HeroSection)
affects: [03-03-and-beyond, seo-verification, above-fold-conversion-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "H1 keyword phrase split across two spans (main + location) for visual hierarchy without losing SEO keyword string"
    - "Trust bar strip with flex layout and right-border dividers between four proof badges"
    - "Hero phone number as tel anchor link with hover color transition"
    - "All hero and trust bar CSS scoped under .landing-page prefix to avoid leaks"

key-files:
  created:
    - src/components/landing/HeroSection.tsx
    - src/components/landing/TrustBar.tsx
  modified:
    - src/pages/landing.css
    - src/pages/LandingPage.tsx

key-decisions:
  - "H1 text is 'Drone Photography and Aerial Inspections' / 'Hampton Roads VA' split across two spans inside the h1 element; the keyword phrase is preserved and the visual separation uses span display:block"
  - "Trust bar uses border-right divider pattern between badges with last-child: border-right none"
  - "LandingPage.tsx header brand name uses div.lp-logo-heading not h1, so HeroSection owns the single H1 document heading"
  - "HeroSection includes the hero background img element (placed as first child inside lp-hero) from Phase 2 image optimization work"

patterns-established:
  - "Hero section component pattern: section.lp-hero > img.lp-hero-bg-img (absolute positioned bg) + div.lp-container > h1 + p + div.actions"
  - "Trust badge pattern: div.lp-trust-bar > div.lp-container > div.lp-trust-bar__badges > div.lp-trust-bar__badge > span.label + span.detail"

requirements-completed: [PAGE-02, PAGE-03, CONV-01, CONV-02]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 3 Plan 02: Hero Section and Trust Bar Summary

**HeroSection with H1 keyword phrase "Drone Photography and Aerial Inspections Hampton Roads VA," phone number tel link, and Get a Quote CTA above the fold, plus TrustBar strip with four proof badges**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T01:03:53Z
- **Completed:** 2026-02-27T01:05:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- HeroSection.tsx created with H1 keyword phrase split across two styled spans, subheadline addressing real estate agents and contractors, Get a Quote CTA linking to #quote, and phone number 760.575.4876 as a clickable tel link
- TrustBar.tsx created with four proof badges: FAA Part 107, $1M Insurance, Veteran Owned, and 48 Hour Turnaround
- landing.css extended with hero sub-element styles and trust bar styles scoped under .landing-page prefix
- LandingPage.tsx header logo changed from h1 to div.lp-logo-heading so HeroSection owns the single document H1
- No "View Our Work" CTA appears above the fold

## Task Commits

Both tasks were implemented in the bulk landing page commit prior to GSD phase tracking:

1. **Task 1: Create HeroSection and TrustBar components** - `2a64a40` (feat: implement landing page phases 1-4)
2. **Task 2: Add CSS for hero rebuild and trust bar, update LandingPage** - `2a64a40` (feat: implement landing page phases 1-4)

**Plan metadata:** (see final commit in state updates)

_Note: All landing page phases 1 through 4 were implemented in a single pre-GSD session commit. GSD is now tracking subsequent plans in these phases._

## Files Created/Modified
- `src/components/landing/HeroSection.tsx` - Hero section with H1 keyword phrase, subheadline, Get a Quote CTA, and phone number tel link
- `src/components/landing/TrustBar.tsx` - Four proof badges in a horizontal strip
- `src/pages/landing.css` - Hero sub-element styles (lines 900-949) and trust bar styles (lines 951-989)
- `src/pages/LandingPage.tsx` - Imports HeroSection and TrustBar, renders them in order, header logo uses div not h1

## Decisions Made
- H1 text splits across two spans for visual hierarchy: `lp-hero__headline-main` at 72px and `lp-hero__headline-location` at 48px in safety orange. The containing h1 element preserves the full keyword phrase for SEO.
- Logo text in the header uses `div.lp-logo-heading` (not h1 or any heading element) since the document heading role belongs to HeroSection.
- HeroSection includes the `img.lp-hero-bg-img` absolute-positioned background image carried forward from Phase 2 image optimization.

## Deviations from Plan

None. The plan spec was implemented exactly. The only contextual note is that implementation predates GSD phase tracking for phase 03 and was committed in a bulk commit with other landing page phases. All artifacts match plan requirements.

## Issues Encountered

None. TypeScript compiles with zero errors. Vite build succeeds in 5.06s. All must-have truths verified: H1 contains the keyword phrase, subheadline addresses real estate agents and contractors, phone number is visible and clickable as tel link, primary CTA reads "Get a Quote" linking to #quote, trust bar shows all four badges, no "View Our Work" CTA above the fold.

## User Setup Required

None. No external service configuration required.

## Next Phase Readiness
- Hero section and trust bar are in place above the fold
- Section anchor IDs confirmed: services, pricing, portfolio, contact, quote
- No "View Our Work" CTA above the fold (CONV-01 satisfied)
- Phone number 760.575.4876 visible in hero section (CONV-02 satisfied)
- Ready for plan 03-03 and subsequent above-fold refinements
- No blockers

---
*Phase: 03-above-fold-content*
*Completed: 2026-02-27*
