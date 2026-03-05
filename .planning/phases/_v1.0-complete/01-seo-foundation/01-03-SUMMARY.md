---
phase: 01-seo-foundation
plan: 03
subsystem: ui
tags: [seo, sitemap, robots-txt, open-graph, twitter-card, react-helmet-async]

# Dependency graph
requires:
  - phase: 01-01
    provides: LandingPageHelmet component with react-helmet-async infrastructure
provides:
  - public/sitemap.xml listing the production landing page URL for Google Search Console
  - public/robots.txt blocking all private routes with Sitemap directive
  - LandingPageHelmet with complete OG and Twitter card tags (8 OG + 4 Twitter)
affects:
  - Google Search Console submission (sitemap.xml ready)
  - Social sharing previews on Twitter and Facebook (OG + Twitter card complete)
  - All phases: robots.txt blocks must be preserved if new private routes are added

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Static sitemap.xml in public/ lists only public routes (no admin, pilot, auth routes)
    - robots.txt uses single User-agent wildcard block with explicit Disallows for all private route prefixes
    - og:image uses absolute HTTPS URL (not relative path) required for social card crawlers
    - twitter:card set to summary_large_image (wider format, shows full hero banner)
    - VITE_PUBLIC_URL env var drives og:url and og:image base URL with production domain fallback

key-files:
  created:
    - public/sitemap.xml
  modified:
    - public/robots.txt
    - src/components/seo/LandingPageHelmet.tsx

key-decisions:
  - "sitemap.xml lists only the landing page root URL; admin, pilot, auth, proposal, invoice, drone-upload, and my-jobs routes are excluded"
  - "robots.txt uses a single User-agent wildcard block rather than per-bot Allow rules (cleaner and equally correct)"
  - "og:image and twitter:image are absolute URLs using VITE_PUBLIC_URL with sentinelaerial.faithandharmonyllc.com fallback (required for social card scrapers)"
  - "twitter:card is summary_large_image not summary (wider format matches the 1200x630 hero banner)"

patterns-established:
  - "Social discovery: sitemap.xml + robots.txt + OG + Twitter card form the complete crawl and share surface"
  - "Private route blocking: any new admin, pilot, or internal route added to the app must also get a Disallow in robots.txt"

requirements-completed: [SEO-04, SEO-05, SEO-09, SEO-10]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 1 Plan 03: Sitemap, Robots, and Social Tags Summary

**Static sitemap.xml, robots.txt blocking 7 private route prefixes with Sitemap directive, and LandingPageHelmet with complete OG and Twitter card tags pointing to absolute hero image URL**

## Performance

- **Duration:** 5 min (verification of pre-existing work)
- **Started:** 2026-02-26T23:47:11Z
- **Completed:** 2026-02-26T23:52:00Z
- **Tasks:** 2 (both verified complete, code pre-existing in commit 2a64a40)
- **Files modified:** 3

## Accomplishments

- public/sitemap.xml validated: valid XML with urlset, lists only the production landing page URL (https://sentinelaerial.faithandharmonyllc.com/)
- public/robots.txt validated: 7 Disallow entries covering /admin/, /pilot/, /auth, /proposal/, /invoice/, /drone-upload/, /my-jobs/ and a Sitemap directive pointing to sitemap.xml
- LandingPageHelmet validated: 8 OG tags (og:type, og:url, og:title, og:description, og:image, og:image:width, og:image:height, og:site_name) and 4 Twitter card tags with twitter:card set to summary_large_image and og:image as absolute HTTPS URL
- npm run typecheck passes with zero errors
- npm run build succeeds

## Task Commits

All work was completed in a prior session commit before GSD tracking was initialized for plan 01-03:

1. **Task 1: Create sitemap.xml and update robots.txt** - `2a64a40` (feat)
2. **Task 2: Add Open Graph and Twitter card tags to LandingPageHelmet** - `2a64a40` (feat)

Note: Both tasks were committed together in commit `2a64a40 feat: implement landing page phases 1-4 (SEO, images, content, below-fold)` before this plan was executed. The work satisfies all success criteria in the plan. This mirrors the execution pattern from plan 01-01.

## Files Created/Modified

- `public/sitemap.xml` - Valid XML sitemap with one URL entry for the production landing page, lastmod 2026-02-26, changefreq monthly, priority 1.0
- `public/robots.txt` - Single wildcard User-agent block with 7 Disallow entries covering all private routes plus Sitemap directive
- `src/components/seo/LandingPageHelmet.tsx` - react-helmet-async Helmet with complete OG and Twitter card tags, absolute image URLs via VITE_PUBLIC_URL

## Key Values

- **Production URL:** https://sentinelaerial.faithandharmonyllc.com (VITE_PUBLIC_URL env var, hard fallback in LandingPageHelmet.tsx)
- **Hero image URL:** https://sentinelaerial.faithandharmonyllc.com/assets/landing/hero-banner.jpg (absolute URL, 1200x630 declared)

## Decisions Made

- sitemap.xml lists only the landing page root URL. Admin, pilot, auth, proposal, invoice, drone-upload, and my-jobs routes are excluded since they are private or authenticated.
- robots.txt uses a single User-agent wildcard block rather than per-bot Allow rules. The old file had no blocks at all. The new file is cleaner and equally correct.
- og:image and twitter:image use absolute HTTPS URLs with the VITE_PUBLIC_URL fallback because social card scrapers (Twitter, Facebook, Slack) require absolute URLs and will not resolve relative paths.
- twitter:card is summary_large_image rather than summary because the hero banner is a wide landscape image and the larger card format better represents the landing page.

## Deviations from Plan

### Pre-existing Implementation

**1. [Pre-existing] All plan artifacts already committed in prior session**
- **Found during:** Initial state assessment
- **Issue:** Plan expected to create sitemap.xml, update robots.txt, and add OG/Twitter tags. All three were already committed in 2a64a40 before this plan executed.
- **Fix:** No fix needed. Verified each artifact against plan requirements. All pass.
- **Files verified:** public/sitemap.xml, public/robots.txt, src/components/seo/LandingPageHelmet.tsx
- **Committed in:** 2a64a40 (pre-existing)

---

**Total deviations:** 1 (pre-existing implementation, no auto-fixes required)
**Impact on plan:** No impact. All success criteria satisfied. Work was done ahead of schedule in the prior implementation session.

## Issues Encountered

None. All success criteria verified against existing committed code.

## User Setup Required

None. The sitemap.xml is ready for Google Search Console submission at:
https://sentinelaerial.faithandharmonyllc.com/sitemap.xml

Add this URL in Google Search Console under Sitemaps after deploying to production.

## Next Phase Readiness

- Plan 01-04 (semantic HTML) can proceed immediately. It has no dependency on this plan.
- Phase 2 (image optimization) can proceed. Hero image path confirmed as /assets/landing/hero-banner.jpg.
- sitemap.xml is ready for Google Search Console submission after production deployment.

---
*Phase: 01-seo-foundation*
*Completed: 2026-02-26*

## Self-Check: PASSED

- public/sitemap.xml: FOUND (contains urlset element)
- public/robots.txt: FOUND (7 Disallow entries, 1 Sitemap directive)
- src/components/seo/LandingPageHelmet.tsx: FOUND (3 og:image occurrences, twitter:card present, summary_large_image present)
- Commit 2a64a40: FOUND in git log
- npm run typecheck: PASSED (zero errors)
- npm run build: PASSED (built in 4.21s)
