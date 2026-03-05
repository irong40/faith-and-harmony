# Phase 11: Standalone Deployment - Research

**Researched:** 2026-03-05
**Domain:** Vercel deployment, Supabase auth configuration, Square production cutover
**Confidence:** HIGH

## Summary

Phase 11 deploys the Trestle PWA as a standalone Vercel project at trestle.sentinelaerial.com, configures Supabase auth redirects for the new subdomain, and cuts over Square from sandbox to production. The existing codebase already uses `window.location.origin` for all auth redirect URLs (signUp, resetPassword, OAuth callbacks), which means the app will automatically adapt to the new domain without code changes to redirect logic.

The main work is infrastructure configuration: creating a new Vercel project linked to the FaithandHarmony repo, adding the subdomain DNS record, configuring Supabase redirect URL allowlist, and swapping Square environment variables from sandbox to production. The square-webhook edge function is missing from `supabase/config.toml` (no `verify_jwt = false` entry), which must be fixed before production webhook registration.

**Primary recommendation:** This phase is primarily ops/config work with minimal code changes. The one code gap is that `square-webhook` needs a config.toml entry. Everything else is Vercel dashboard, Supabase dashboard, Square Developer Console, and DNS configuration.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-02 | Trestle deployed as standalone Vercel project at trestle.sentinelaerial.com | Vercel supports multiple projects on same domain via subdomain CNAME records. Existing vercel.json has SPA rewrites and security headers. PWA manifest already configured. |
| DEPLOY-03 | Supabase auth redirect URLs include trestle.sentinelaerial.com | Supabase dashboard URL Configuration page allows adding redirect URLs. App already uses `window.location.origin` so no code changes needed. Add both exact paths used in auth flows. |
| DEPLOY-04 | Square production environment configured with production webhook registration | Existing edge functions already support `SQUARE_ENVIRONMENT` toggle (sandbox vs production). Webhook function exists but needs config.toml entry. Production webhook registered via Square Developer Console. |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel | CLI/Dashboard | Hosting platform for both projects | Already hosts sentinel-landing at sentinelaerial.com |
| Supabase | Single project (qjpujskwqaehxnqypxzu) | Auth, DB, edge functions, storage | Shared backend for both landing and Trestle |
| Square API | v2024-01-18 | Payment processing | Already integrated for deposit invoices |
| vite-plugin-pwa | 1.2.0 | PWA manifest and service worker | Already configured with Sentinel branding |

### Supporting (No New Libraries Needed)
This phase requires zero new npm dependencies. All work is configuration and infrastructure.

## Architecture Patterns

### Current Deployment Architecture
```
sentinelaerial.com          -> sentinel-landing repo (Vercel project A)
trestle.sentinelaerial.com  -> FaithandHarmony repo (Vercel project B) [NEW]

Both apps share:
  - Supabase project: qjpujskwqaehxnqypxzu
  - Square merchant account
  - Resend email delivery
```

### Pattern 1: Vercel Subdomain as Separate Project
**What:** Each subdomain is its own Vercel project, linked to its own repo, with its own environment variables.
**When to use:** When apps have different codebases but share backend infrastructure.
**How:**
1. Create new Vercel project from FaithandHarmony repo
2. Add custom domain `trestle.sentinelaerial.com` in Vercel project settings
3. Add CNAME record `trestle` pointing to `cname.vercel-dns.com` at DNS provider
4. Vercel auto-provisions SSL certificate

### Pattern 2: Dynamic Origin Auth Redirects (Already Implemented)
**What:** Using `window.location.origin` instead of hardcoded URLs for auth redirects.
**When to use:** When the same codebase deploys to multiple domains.
**Evidence from codebase:**
```typescript
// AuthContext.tsx line 124
const redirectUrl = `${window.location.origin}/`;

// Auth.tsx line 114
emailRedirectTo: `${window.location.origin}/`,

// Auth.tsx line 141
redirectTo: `${window.location.origin}/auth`,

// Settings.tsx line 51
const redirectUri = `${window.location.origin}/admin/settings`;
```
All redirect URLs derive from `window.location.origin`, so they will automatically use `https://trestle.sentinelaerial.com` when deployed there. No code changes needed.

### Pattern 3: Square Environment Toggle (Already Implemented)
**What:** The `create-deposit-invoice` edge function reads `SQUARE_ENVIRONMENT` env var to select sandbox vs production API base URL.
**Evidence from codebase:**
```typescript
// create-deposit-invoice/index.ts line 14
const SQUARE_ENV = Deno.env.get("SQUARE_ENVIRONMENT") ?? "sandbox";

const SQUARE_BASE =
  SQUARE_ENV === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
```

### Anti-Patterns to Avoid
- **Hardcoding domain in code:** All auth redirects already use `window.location.origin`. Do NOT introduce any hardcoded `trestle.sentinelaerial.com` strings in client code.
- **Using wildcard redirect URLs in production:** Supabase supports wildcards but the docs recommend exact URLs in production for security.
- **Forgetting to update SQUARE_WEBHOOK_URL env var:** The webhook function falls back to `${SUPABASE_URL}/functions/v1/square-webhook` but the env var should match exactly what Square registers for HMAC signature validation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSL certificates | Custom cert management | Vercel auto-provisioning | Vercel handles SSL automatically for custom domains |
| DNS management | Manual DNS record creation scripts | DNS provider dashboard | One time CNAME record, manual is faster and safer |
| Webhook signature validation | New validation logic | Existing square-webhook function | Already implements HMAC-SHA256 with timing-safe comparison |
| Environment variable management | Custom config files | Vercel dashboard + Supabase dashboard | Both platforms have built-in secrets management |

## Common Pitfalls

### Pitfall 1: Missing square-webhook in config.toml
**What goes wrong:** The `square-webhook` edge function is NOT listed in `supabase/config.toml` with `verify_jwt = false`. When deployed, Supabase will require a JWT for webhook calls from Square, causing all webhook deliveries to fail with 401.
**Why it happens:** The function was likely added after the initial config.toml setup.
**How to avoid:** Add `[functions.square-webhook]` with `verify_jwt = false` to config.toml before deploying.
**Warning signs:** Square webhook test events return 401. Payment status never updates from "pending" to "paid."

### Pitfall 2: Square HMAC Signature Mismatch
**What goes wrong:** Square computes HMAC using `webhookUrl + rawBody`. If the `SQUARE_WEBHOOK_URL` env var does not match the URL registered in Square Developer Console (character for character), every webhook signature will fail.
**Why it happens:** The webhook URL registered in Square must match the URL the function uses for signature computation.
**How to avoid:** Set `SQUARE_WEBHOOK_URL` in Supabase edge function secrets to the exact URL registered in Square. The function already has a fallback: `${SUPABASE_URL}/functions/v1/square-webhook` (line 10-11 of square-webhook/index.ts).
**Warning signs:** Webhook calls return 401 "Invalid signature" in edge function logs.

### Pitfall 3: Supabase Redirect URL Allowlist Incomplete
**What goes wrong:** Login works but password reset or signup confirmation emails redirect to the wrong URL or fail.
**Why it happens:** Supabase only allows redirects to URLs in the allowlist. Each distinct path used in `emailRedirectTo` and `redirectTo` must be listed.
**How to avoid:** Add these exact URLs to Supabase URL Configuration:
  - `https://trestle.sentinelaerial.com/` (signup confirmation)
  - `https://trestle.sentinelaerial.com/auth` (password reset)
  - `https://trestle.sentinelaerial.com/admin/settings` (Google Calendar OAuth callback)
**Warning signs:** After email verification, user lands on old domain or gets a redirect error.

### Pitfall 4: Vercel Environment Variables Not Set
**What goes wrong:** Build succeeds but app shows blank screen or fails to connect to Supabase.
**Why it happens:** The new Vercel project has no environment variables configured. The `.env` file is gitignored and does not transfer.
**How to avoid:** Copy these from the existing deployment or local `.env`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_WAYPOINTMAP_API_KEY` (if used)
**Warning signs:** Console errors about undefined Supabase URL. White screen on load.

### Pitfall 5: Square Sandbox Data in Production
**What goes wrong:** After switching to production Square credentials, old sandbox invoice IDs and payment records in Supabase reference nonexistent Square objects.
**Why it happens:** Sandbox and production are completely separate Square environments. Sandbox invoice IDs have no meaning in production.
**How to avoid:** Archive or clearly mark all sandbox payment records before cutover. Do not attempt to "migrate" sandbox data.
**Warning signs:** API calls to Square return 404 for existing square_invoice_id values.

### Pitfall 6: PWA Service Worker Caching Stale Domain
**What goes wrong:** The service worker caches API responses for the old Supabase REST endpoint pattern. If the Supabase URL changes (it won't in this case since the backend is shared), cached responses would be stale.
**Why it happens:** Workbox runtime caching in vite.config.ts has hardcoded Supabase project URL in the urlPattern regex.
**How to avoid:** Since the Supabase project URL stays the same, this is not a problem for this deployment. The urlPattern `qjpujskwqaehxnqypxzu.supabase.co` matches regardless of which frontend domain serves the app.
**Warning signs:** Not applicable for this deployment. Flagged for awareness only.

## Code Examples

### Config.toml Addition (Required)
```toml
# supabase/config.toml - ADD this entry
[functions.square-webhook]
verify_jwt = false
```

### Vercel Environment Variables (Required)
```
# Vercel project settings -> Environment Variables
VITE_SUPABASE_URL=https://qjpujskwqaehxnqypxzu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from .env>
```

### Supabase Redirect URLs (Required)
```
# Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs
https://trestle.sentinelaerial.com/
https://trestle.sentinelaerial.com/auth
https://trestle.sentinelaerial.com/admin/settings
```

### Square Production Environment Variables (Supabase Edge Function Secrets)
```
# Supabase Dashboard -> Edge Functions -> Secrets (or CLI)
SQUARE_ACCESS_TOKEN=<production access token>
SQUARE_LOCATION_ID=<production location ID>
SQUARE_ENVIRONMENT=production
SQUARE_WEBHOOK_SIGNATURE_KEY=<from Square Developer Console production webhook>
SQUARE_WEBHOOK_URL=https://qjpujskwqaehxnqypxzu.supabase.co/functions/v1/square-webhook
```

### DNS CNAME Record
```
Type: CNAME
Name: trestle
Value: cname.vercel-dns.com
TTL: 3600 (or Auto)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single Vercel deployment for all | Separate Vercel projects per app | Standard practice | Clean separation of concerns, independent deploys |
| Hardcoded redirect URLs | `window.location.origin` dynamic | Already implemented | Zero code changes needed for new domain |
| Manual Square env switching | `SQUARE_ENVIRONMENT` env var | Already implemented | Just change env var value from "sandbox" to "production" |

## Open Questions

1. **DNS Provider for sentinelaerial.com**
   - What we know: The domain exists and is live. sentinel-landing repo deploys to it via Vercel.
   - What's unclear: Which DNS provider manages the records (Namecheap, Cloudflare, Vercel DNS, etc.)
   - Recommendation: Check Vercel dashboard for sentinel-landing project to see DNS configuration. The CNAME record must be added at whatever DNS provider manages sentinelaerial.com.

2. **Square Production Application**
   - What we know: Sandbox is configured. Edge functions reference `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`.
   - What's unclear: Whether a Square production application already exists or needs to be created in Square Developer Console.
   - Recommendation: Check Square Developer Console for existing production application. If sandbox only, the same application can be switched to production mode.

3. **Existing Sandbox Payment Data**
   - What we know: The payments table has sandbox Square invoice IDs from testing.
   - What's unclear: How many sandbox records exist and whether they need archiving or can be left with a status flag.
   - Recommendation: Before cutover, update sandbox payment records with a flag or archive them. At minimum, document which records are sandbox so they do not confuse production accounting.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vite.config.ts (inline test config) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-02 | PWA loads at subdomain and is installable | manual-only | Manual: visit trestle.sentinelaerial.com, check PWA install prompt | N/A |
| DEPLOY-03 | Auth login/signup/reset works at subdomain | manual-only | Manual: test login, signup, password reset flows at new domain | N/A |
| DEPLOY-04 | Square production webhook processes payments | manual-only | Manual: Square test event from Developer Console, verify payment status update | N/A |

**Justification for manual-only:** All three requirements are deployment/infrastructure verification. They require a live production environment (Vercel, Supabase dashboard, Square Developer Console, DNS propagation). These cannot be automated in the Vitest unit test suite.

### Sampling Rate
- **Per task commit:** `npm test` (ensure no regressions from config.toml change)
- **Per wave merge:** `npm test && npm run typecheck`
- **Phase gate:** Full test suite green plus manual verification of all three success criteria

### Wave 0 Gaps
None. The only code change (config.toml entry) requires no test infrastructure. All verification is manual deployment testing.

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx`, `src/pages/admin/Settings.tsx` for redirect URL patterns
- Project codebase: `supabase/functions/create-deposit-invoice/index.ts` for Square environment toggle
- Project codebase: `supabase/functions/square-webhook/index.ts` for webhook signature validation
- Project codebase: `supabase/config.toml` for missing square-webhook entry
- Project codebase: `vercel.json` for existing SPA rewrite and security headers
- Project codebase: `vite.config.ts` for PWA manifest configuration

### Secondary (MEDIUM confidence)
- [Vercel Working with Domains](https://vercel.com/docs/domains/working-with-domains) for subdomain CNAME setup
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) for allowlist configuration
- [Square Webhooks Overview](https://developer.squareup.com/docs/webhooks/overview) for production webhook registration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No new libraries. All infrastructure already exists.
- Architecture: HIGH. Codebase already uses dynamic origin patterns. Zero code changes for auth redirects.
- Pitfalls: HIGH. Verified against actual codebase. Missing config.toml entry confirmed by grep.

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable infrastructure, unlikely to change)
