---
phase: 02-image-optimization
plan: "02"
subsystem: ui
tags: [react, typescript, css, performance, lcp, lazy-loading, fetchpriority]

# Dependency graph
requires:
  - phase: 01-seo-foundation
    provides: LandingPage component structure with HeroSection extracted into dedicated component
provides:
  - Hero image served via HTML img element with fetchPriority="high" for LCP optimization
  - Below-fold equipment images with loading="lazy", width, and height for layout shift prevention
  - CSS background-image url() removed from hero rule in landing.css
affects: [03-content-pages, 04-quote-form]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hero image as absolute positioned img element inside position:relative section, using CSS gradient overlays on top via stacking order"
    - "fetchPriority='high' on LCP image with no loading attribute (never lazy for above-fold)"
    - "loading='lazy' on all below-fold images with explicit width and height for CLS prevention"

key-files:
  created: []
  modified:
    - src/components/landing/HeroSection.tsx
    - src/pages/landing.css

key-decisions:
  - "Hero img element placed as first child inside .lp-hero section using absolute positioning (inset:0) so CSS gradient overlays in background shorthand paint above it via stacking order"
  - "hero-banner.jpg dimensions confirmed as 1920x1080 (standard landscape); matrice-4e.png dimensions confirmed as 600x400"
  - "Equipment section hero-banner.jpg reuse noted: same image file serves both hero background and equipment fleet card; each usage has correct attributes for its fold position"

patterns-established:
  - "LCP image pattern: img element with fetchPriority='high', no loading attribute, explicit width/height, absolute inset:0 inside position:relative container"
  - "Below-fold image pattern: loading='lazy', explicit width/height matching natural dimensions, CSS controls display size"

requirements-completed: [IMG-03, IMG-04, IMG-05]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 02 Plan 02: Hero Image and Lazy Loading Summary

**Hero banner moved from CSS background-image to HTML img with fetchPriority="high"; below-fold equipment images get loading="lazy", width, and height for CLS prevention**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T00:50:43Z
- **Completed:** 2026-02-27T00:53:00Z
- **Tasks:** 2 auto tasks verified (pre-existing implementation)
- **Files modified:** 2

## Accomplishments

- Hero section serves its background photo via an img element with fetchPriority="high" instead of a CSS background-image url(), making it visible to crawlers and preloadable by browsers
- CSS .lp-hero rule retains three gradient layers for text contrast overlay; the img sits at z-index 0 as an absolute positioned child
- Both equipment section images (matrice-4e.png and hero-banner.jpg) carry loading="lazy", width, and height, preventing layout shift as the user scrolls down
- Build passes clean with no TypeScript errors

## Task Commits

Both tasks were implemented as part of an earlier pre-GSD commit. No new commits were required for this plan because all changes were already in HEAD.

1. **Task 1: Add hero img element and remove CSS background-image** - `2a64a40` (feat: implement landing page phases 1-4)
2. **Task 2: Add width, height, and loading="lazy" to below-fold images** - `2a64a40` (feat: implement landing page phases 1-4)

## Files Created/Modified

- `src/components/landing/HeroSection.tsx` - img.lp-hero-bg-img with fetchPriority="high", width={1920}, height={1080}; no loading attribute
- `src/pages/landing.css` - .lp-hero background shorthand has no url() reference; .lp-hero-bg-img rule added for absolute positioning

## Decisions Made

- Hero img placed as first child inside .lp-hero section with absolute positioning (inset:0). The three CSS gradient layers in the background shorthand paint above it by default stacking order, preserving the dark overlay for text contrast.
- Image dimensions used are confirmed natural values. hero-banner.jpg is 1920x1080. matrice-4e.png is 600x400.
- hero-banner.jpg appears twice in LandingPage.tsx: once in HeroSection (above fold, fetchPriority="high", no lazy) and once in the equipment section (below fold, loading="lazy"). Each instance has the correct attributes for its position.

## Deviations from Plan

None. The plan was fully implemented prior to GSD phase execution. All automated verification checks pass:

- `lp-hero-bg-img` class present in HeroSection.tsx and landing.css
- `fetchPriority="high"` present in HeroSection.tsx
- No `url('/assets/landing/hero-banner.jpg')` in landing.css (grep returns no matches)
- Two `loading="lazy"` attributes in LandingPage.tsx (lines 90 and 103)
- `npm run build` completes with no errors

## Issues Encountered

None.

## User Setup Required

None. No external service configuration required.

## Next Phase Readiness

- Image loading strategy complete. LCP image is an HTML element with high fetch priority. Below-fold images defer until scroll.
- Phase 3 (content pages) can proceed. PortfolioGrid.tsx already has 6 aerial photos in /assets/aerial/.
- No blockers for Phase 3 or Phase 4.

---
*Phase: 02-image-optimization*
*Completed: 2026-02-27*
