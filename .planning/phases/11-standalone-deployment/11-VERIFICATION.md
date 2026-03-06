---
phase: 11-standalone-deployment
verified: 2026-03-05T20:00:00Z
status: gaps_found
score: 0/3 must-haves verified
re_verification: false
gaps:
  - truth: "trestle.sentinelaerial.com loads the pilot portal PWA and is installable on mobile devices"
    status: failed
    reason: "No evidence that Vercel project, DNS CNAME, or custom domain have been configured. These are human dashboard tasks (Plan 11-01 Task 2) that have not been completed."
    artifacts:
      - path: "vercel.json"
        issue: "File exists with SPA rewrites but no Vercel project deployment evidence for trestle subdomain"
      - path: "vite.config.ts"
        issue: "PWA manifest configured correctly but not deployed to trestle.sentinelaerial.com"
    missing:
      - "Create Vercel project from FaithandHarmony repo"
      - "Add custom domain trestle.sentinelaerial.com in Vercel project settings"
      - "Add DNS CNAME record: trestle -> cname.vercel-dns.com"
      - "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY env vars in Vercel"
  - truth: "Login at trestle.sentinelaerial.com works correctly with Supabase auth redirect URLs configured for the subdomain"
    status: failed
    reason: "Client code uses window.location.origin (no code changes needed), but the Supabase auth redirect URL allowlist has not been configured for the new subdomain. This is a dashboard task (Plan 11-01 Task 2 Step D)."
    artifacts:
      - path: "src/contexts/AuthContext.tsx"
        issue: "Correctly uses window.location.origin. No code issue. Blocked by missing Supabase dashboard config."
      - path: "src/pages/Auth.tsx"
        issue: "Correctly uses window.location.origin. No code issue. Blocked by missing Supabase dashboard config."
    missing:
      - "Add https://trestle.sentinelaerial.com/ to Supabase redirect URL allowlist"
      - "Add https://trestle.sentinelaerial.com/auth to Supabase redirect URL allowlist"
      - "Add https://trestle.sentinelaerial.com/admin/settings to Supabase redirect URL allowlist"
  - truth: "Square production webhook is registered and processes real payments (sandbox data archived, production environment variables set)"
    status: failed
    reason: "The square-webhook edge function code and config.toml entry are complete, but no evidence of Square production webhook registration, production credential setup, or sandbox data archival. These are human dashboard tasks (Plan 11-02 Task 1)."
    artifacts:
      - path: "supabase/functions/square-webhook/index.ts"
        issue: "Function code is production ready. Blocked by missing Square production registration."
      - path: "supabase/functions/create-deposit-invoice/index.ts"
        issue: "SQUARE_ENVIRONMENT toggle implemented. Blocked by missing production env var configuration."
    missing:
      - "Register production webhook endpoint in Square Developer Console"
      - "Set SQUARE_ACCESS_TOKEN to production value in Supabase edge function secrets"
      - "Set SQUARE_LOCATION_ID to production value in Supabase edge function secrets"
      - "Set SQUARE_ENVIRONMENT=production in Supabase edge function secrets"
      - "Set SQUARE_WEBHOOK_SIGNATURE_KEY to production value in Supabase edge function secrets"
      - "Archive or flag sandbox payment records in payments table"
human_verification:
  - test: "Visit https://trestle.sentinelaerial.com and verify PWA loads"
    expected: "App loads, service worker registers, PWA install prompt appears on mobile"
    why_human: "Requires live Vercel deployment and DNS propagation"
  - test: "Test login/signup/reset flows at trestle.sentinelaerial.com"
    expected: "Auth works, confirmation and reset emails link back to trestle.sentinelaerial.com"
    why_human: "Requires Supabase redirect URL allowlist configured in dashboard"
  - test: "Send Square test webhook event and verify edge function processes it"
    expected: "Edge function returns 200, logs show webhook receipt"
    why_human: "Requires Square production webhook registration in Developer Console"
---

# Phase 11: Standalone Deployment Verification Report

**Phase Goal:** Trestle is deployed as a standalone app at trestle.sentinelaerial.com with production payment processing
**Verified:** 2026-03-05T20:00:00Z
**Status:** gaps_found
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | trestle.sentinelaerial.com loads the pilot portal PWA and is installable on mobile devices | FAILED | PWA config exists in vite.config.ts and vercel.json has SPA rewrites, but no Vercel project, DNS, or domain setup has been done |
| 2 | Login at trestle.sentinelaerial.com works correctly with Supabase auth redirect URLs configured for the subdomain | FAILED | Client code correctly uses window.location.origin (no code changes needed), but Supabase redirect URL allowlist not configured |
| 3 | Square production webhook is registered and processes real payments | FAILED | square-webhook function and config.toml entry are complete (commit b2b833e), but production webhook not registered, credentials not set, sandbox data not archived |

**Score:** 0/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/config.toml` | square-webhook function entry with verify_jwt = false | VERIFIED | Lines 105-106 contain `[functions.square-webhook]` with `verify_jwt = false`. Commit b2b833e. |
| `supabase/functions/square-webhook/index.ts` | HMAC validated webhook handler that updates payment status | VERIFIED | 195 lines. HMAC-SHA256 validation, idempotency check, payment status update to "paid". Production ready. |
| `supabase/functions/create-deposit-invoice/index.ts` | SQUARE_ENVIRONMENT toggle for sandbox/production | VERIFIED | Line 14 reads SQUARE_ENVIRONMENT env var, defaults to sandbox, switches API base URL accordingly. |
| `vercel.json` | SPA rewrites and security headers | VERIFIED | SPA rewrite rule and 5 security headers (X-Frame-Options, HSTS, etc.) |
| `vite.config.ts` | PWA manifest with Sentinel branding | VERIFIED | Full PWA config with name "Trestle Field Operations", icons, workbox caching, service worker registration. |
| `public/pwa-192x192.png` | PWA icon for mobile install | VERIFIED | File exists |
| `public/pwa-512x512.png` | PWA icon for mobile install | VERIFIED | File exists |
| `src/contexts/AuthContext.tsx` | Dynamic origin redirect URL | VERIFIED | Line 124 uses `${window.location.origin}/` |
| `src/pages/Auth.tsx` | Dynamic origin for signup and reset | VERIFIED | Lines 114, 141 use `${window.location.origin}` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| Vercel project | trestle.sentinelaerial.com | DNS CNAME record | NOT WIRED | Vercel project not created, DNS record not added. Human dashboard task. |
| Supabase auth | trestle.sentinelaerial.com | Redirect URL allowlist | NOT WIRED | Redirect URLs not added to Supabase dashboard. Human dashboard task. |
| Square Developer Console webhook | supabase edge function square-webhook | HTTPS POST with HMAC | NOT WIRED | Production webhook not registered. Human dashboard task. |
| create-deposit-invoice | Square production API | SQUARE_ENVIRONMENT env var | NOT WIRED | Env var not set to "production" in Supabase secrets. Human dashboard task. |
| Auth.tsx signup | Supabase auth | window.location.origin | WIRED (code level) | Code correctly uses dynamic origin. Will work once Supabase allowlist is configured. |
| Auth.tsx reset | Supabase auth | window.location.origin | WIRED (code level) | Code correctly uses dynamic origin. Will work once Supabase allowlist is configured. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEPLOY-02 | 11-01 | Trestle deployed as standalone Vercel project at trestle.sentinelaerial.com | BLOCKED | All code artifacts ready (vercel.json, vite.config.ts, PWA manifest). Blocked on human dashboard tasks: Vercel project creation, domain setup, DNS CNAME. |
| DEPLOY-03 | 11-01 | Supabase auth redirect URLs include trestle.sentinelaerial.com | BLOCKED | Client code uses window.location.origin. Blocked on adding redirect URLs to Supabase dashboard. |
| DEPLOY-04 | 11-02 | Square production environment configured with production webhook registration | BLOCKED | Edge function code and config.toml are production ready. Blocked on Square production webhook registration, credential setup, and sandbox data archival. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/square-webhook/index.ts` | 183 | TODO comment: "Plan 04: Trigger receipt email when BOTH deposit and balance are paid" | Info | Phase 9 scope (BILL-06), not a Phase 11 blocker |

### Human Verification Required

All three success criteria for Phase 11 require human action and verification. The codebase work (one commit) is complete. The remaining work is entirely infrastructure and dashboard configuration.

### 1. Deploy Trestle to trestle.sentinelaerial.com

**Test:** Create Vercel project, add DNS CNAME, verify site loads
**Expected:** trestle.sentinelaerial.com loads the Trestle PWA with service worker and install prompt
**Why human:** Requires Vercel dashboard, DNS provider access, and manual SSL verification

### 2. Configure Supabase Auth Redirects

**Test:** Add redirect URLs to Supabase dashboard, test login/signup/reset at new domain
**Expected:** Auth flows complete successfully, emails link back to trestle.sentinelaerial.com
**Why human:** Requires Supabase dashboard access and end-to-end auth flow testing

### 3. Register Square Production Webhook

**Test:** Register webhook in Square Developer Console, set production env vars, send test event
**Expected:** Edge function receives and processes webhook event with 200 response
**Why human:** Requires Square Developer Console access and production credential management

## Gaps Summary

Phase 11 is an infrastructure/ops phase with minimal code changes. The single required code change (adding `[functions.square-webhook]` to `supabase/config.toml`) was completed in commit `b2b833e`. All other artifacts (PWA manifest, auth redirect code, webhook handler, environment toggle) were already in place from prior phases.

The phase is blocked entirely on human dashboard tasks that cannot be performed by code automation. These are documented in Plan 11-01 Task 2 (Vercel, DNS, Supabase) and Plan 11-02 Task 1 (Square production). No further code changes are needed. The user must complete the infrastructure setup steps documented in the plans.

**Bottom line:** Code readiness is 100%. Infrastructure readiness is 0%. The phase goal cannot be achieved until the human completes the dashboard configuration steps outlined in both plans.

---

_Verified: 2026-03-05T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
