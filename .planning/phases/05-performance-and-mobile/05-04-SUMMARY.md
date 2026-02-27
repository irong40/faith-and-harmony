---
phase: 05-performance-and-mobile
plan: "04"
subsystem: infra
tags: [vercel, security-headers, hsts, csp, deployment]

# Dependency graph
requires:
  - phase: 05-performance-and-mobile
    provides: vercel.json with SPA rewrite rule
provides:
  - Security response headers on all Vercel routes (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security, Permissions-Policy)
  - Preserved SPA rewrite rule for React Router compatibility
affects: [deployment, security]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vercel headers array coexists with rewrites array in vercel.json"
    - "Wildcard source /(.*) applies headers to all routes"

key-files:
  created: []
  modified:
    - vercel.json

key-decisions:
  - "No Content-Security-Policy added: landing page loads Google Fonts and cdn.gpteng.co scripts; a permissive CSP would be ineffective and a restrictive one requires dedicated testing before deployment"
  - "No X-XSS-Protection added: deprecated in modern browsers, can cause issues on older IE"
  - "Permissions-Policy disables camera, microphone, and geolocation: landing page uses none of these APIs"
  - "HSTS max-age 63072000 (2 years) with includeSubDomains and preload: Faith and Harmony LLC operates exclusively over HTTPS"

patterns-established:
  - "Security headers: applied via headers array in vercel.json, separate from rewrites array"

requirements-completed:
  - PERF-03

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 5 Plan 4: Security Headers Summary

**Five HTTP security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS, Permissions-Policy) added to all Vercel routes via vercel.json headers array**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T00:12:43Z
- **Completed:** 2026-02-27T00:14:51Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- vercel.json updated with a headers array applying five security response headers to all routes
- SPA rewrite rule preserved unchanged so the React app loads at all paths
- HSTS with 2-year max-age and preload eligibility configured
- Permissions-Policy disables camera, microphone, and geolocation browser APIs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add security headers to vercel.json** - `980239e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `vercel.json` - Added headers array with five security headers on wildcard source, SPA rewrite preserved

## Decisions Made

- No Content-Security-Policy added. The landing page loads Google Fonts from fonts.googleapis.com and fonts.gstatic.com, and uses the gptengineer.js script from cdn.gpteng.co. A permissive CSP provides no protection and a restrictive one requires significant testing before deployment. Deferred to v2.
- No X-XSS-Protection added. This header is deprecated in modern browsers and can cause rendering issues on older IE.

## Deviations from Plan

None. Plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None. No external service configuration required. Headers take effect automatically on the next Vercel deployment.

## Next Phase Readiness

Phase 5 is now complete. All four plans executed:

- 05-01: Reduced motion and animation overrides for accessibility
- 05-02: Tablet (769px to 1024px) and small mobile (480px) breakpoints
- 05-03: (completed prior to this plan)
- 05-04: Security response headers

PERF-03 satisfied. The site is ready for production deployment with security headers on all routes.

---
*Phase: 05-performance-and-mobile*
*Completed: 2026-02-27*
