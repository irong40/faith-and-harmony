---
phase: 02-image-optimization
plan: 01
subsystem: ui
tags: [image-optimization, png, webp, sharp, performance, landing-page]

# Dependency graph
requires:
  - phase: 01-seo-foundation
    provides: LandingPage.tsx with logo img element having placeholder width/height attributes
provides:
  - Compressed sentinel-logo.png at 33 KB (down from 1.1 MB)
  - sentinel-logo.webp at 28 KB for WebP-capable browsers
  - Logo img element with accurate width/height attributes matching compressed dimensions
affects: [02-image-optimization plans that reference logo asset]

# Tech tracking
tech-stack:
  added: [sharp-cli@5.2.0 (via npx, no install needed)]
  patterns: [PNG compression via sharp-cli with compressionLevel 9 and effort 6, WebP generated from already-compressed PNG]

key-files:
  created:
    - public/assets/landing/sentinel-logo.webp
  modified:
    - public/assets/landing/sentinel-logo.png
    - src/pages/LandingPage.tsx

key-decisions:
  - "PNG resized to 300px wide (from 400px) to reach under 100 KB; original was square so output is 300x300"
  - "compressionLevel 9 with effort 6 required to reach target size; quality flag has no effect on lossless PNG"
  - "WebP generated from already-compressed PNG, not original 1.1 MB source"
  - "Logo img width and height updated from placeholder 400x400 to actual 300x300 to match compressed file"

patterns-established:
  - "Use sharp-cli with --format png --compressionLevel 9 --effort 6 for PNG optimization (quality flag is ignored for PNG)"
  - "Generate WebP from the compressed PNG source, not the original"

requirements-completed: [IMG-01, IMG-02]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 2 Plan 01: Logo Compression Summary

**sentinel-logo.png compressed from 1.1 MB to 33 KB via sharp-cli resize and lossless PNG compression, with a 28 KB WebP variant and corrected img dimensions in LandingPage.tsx**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T00:50:08Z
- **Completed:** 2026-02-27T00:52:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Reduced logo PNG from 1.1 MB to 33 KB (97% reduction) by resizing to 300x300 and applying compressionLevel 9
- Generated sentinel-logo.webp at 28 KB (15% smaller than compressed PNG) for WebP-capable browsers
- Updated logo img element width and height from placeholder 400x400 to actual 300x300

## Task Commits

Each task was committed atomically:

1. **Task 1: Compress sentinel-logo.png and generate WebP variant** - `e55d4aa` (feat)
2. **Task 2: Update logo img width and height to match compressed dimensions** - `69a9389` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `public/assets/landing/sentinel-logo.png` - Compressed from 1.1 MB to 33 KB, resized to 300x300
- `public/assets/landing/sentinel-logo.webp` - WebP variant at 28 KB, generated from compressed PNG
- `src/pages/LandingPage.tsx` - Logo img width/height updated from 400x400 to 300x300

## Decisions Made
- PNG quality flag has no effect on lossless PNG compression. Used compressionLevel 9 (zlib max) and effort 6 (sharp max) instead.
- Resized to 300px wide instead of 400px to reach under 100 KB. The logo is square, so output is 300x300.
- WebP is generated from the already-compressed 300x300 PNG, not the original 1.1 MB file.
- The placeholder height of 400 from plan 01-04 was updated to 300 to match actual compressed dimensions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] sharp-cli PNG quality flag ignored; used compressionLevel and effort instead**
- **Found during:** Task 1 (compress PNG)
- **Issue:** The plan specified `-- png --quality 80` but this syntax is invalid in sharp-cli v5. PNG is lossless compression so quality has no effect anyway.
- **Fix:** Used `--format png --compressionLevel 9 --effort 6` with `resize 300` (instead of 400) to hit the under-100-KB target.
- **Files modified:** public/assets/landing/sentinel-logo.png
- **Verification:** `ls -lh` shows 34K, node size check PASS at 33 KB
- **Committed in:** e55d4aa (Task 1 commit)

**2. [Rule 1 - Bug] Updated placeholder height 400 to actual 300 in LandingPage.tsx**
- **Found during:** Task 2 (add width/height)
- **Issue:** Plan 01-04 added placeholder width={400} height={400}. After compression to 300x300, the height attribute was wrong.
- **Fix:** Updated both width and height from 400 to 300 to match actual compressed dimensions.
- **Files modified:** src/pages/LandingPage.tsx
- **Verification:** grep confirms width={300} height={300} on the logo img element
- **Committed in:** 69a9389 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bug fixes)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- sharp-cli v5 requires different syntax than the plan specified. The plan used `-- png --quality 80` but the correct pattern is `--format png --quality N` as global flags. Additionally, PNG does not support lossy quality reduction, so compressionLevel and effort are the effective levers.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Compressed PNG and WebP variant are in place for the landing page
- Plan 02-02 (hero image optimization) can proceed
- The WebP variant is available but not yet wired up via a picture element (deferred to Phase 5 per plan spec)

## Self-Check: PASSED

- FOUND: public/assets/landing/sentinel-logo.png (33 KB, under 100 KB)
- FOUND: public/assets/landing/sentinel-logo.webp (28 KB, smaller than PNG)
- FOUND: src/pages/LandingPage.tsx with width={300} height={300} on logo img
- FOUND commit e55d4aa (Task 1)
- FOUND commit 69a9389 (Task 2)
- Build: npm run build passed without errors

---
*Phase: 02-image-optimization*
*Completed: 2026-02-26*
