# Stack Research

**Domain:** Billing flow, image watermarking, accessories CRUD, offline flight log sync, production PWA icons, Vercel standalone deployment
**Researched:** 2026-03-05
**Confidence:** HIGH

## Context: Additive Only (v2.0 Milestone)

This is a subsequent milestone on top of a validated v1.0/v1.1 stack. The following are already in place and are NOT reconsidered here:

- React 18 + Vite 5 + TypeScript 5 + Tailwind 3 + Shadcn/ui
- Supabase (shared project qjpujskwqaehxnqypxzu, 56+ migrations, 41+ edge functions)
- @supabase/supabase-js ^2.86.0 + @tanstack/react-query ^5.56.2
- vite-plugin-pwa ^1.2.0 with Workbox runtime caching
- IndexedDB sync engine (sync_queue, missions_cache, fleet_cache stores)
- Square payment integration (create-deposit-invoice, square-webhook edge functions)
- Resend email delivery (drone-delivery-email and other edge functions)
- Vercel deployment with SPA rewrites and security headers
- react-hook-form + zod for form validation
- date-fns ^3.6.0 for date operations

Every item below is a NET NEW addition or modification required for v2.0 features only.

---

## Recommended Stack Additions

### 1. Square API Version Upgrade

| Item | Current | Target | Why |
|------|---------|--------|-----|
| SQUARE_API_VERSION constant | 2024-01-18 | 2025-10-16 | Latest stable version. The Invoices API endpoint structure (POST /v2/invoices, POST /v2/invoices/{id}/publish) has not changed shape. The version header is the only thing that updates. Staying current avoids deprecation warnings and enables any newer payment request fields. |

**No new dependencies.** The existing pattern uses raw `fetch()` against `connect.squareup.com` / `connect.squareupsandbox.com` with bearer token auth. This is the correct approach for Deno edge functions where the Square Node SDK cannot run.

**New edge function needed:** `create-balance-invoice` following the identical pattern as `create-deposit-invoice`. Differences are:
- `payment_type: "balance"` instead of `"deposit"`
- Amount calculation: `total - deposit_amount` (remaining balance)
- Invoice number prefix: `SAI-BAL-{shortId}` instead of `SAI-DEP-{shortId}`
- Triggered after delivery previews are sent, not after quote acceptance

The `square-webhook` handler already processes `invoice.payment_made` events and marks payments as paid. It needs one addition: when a balance payment is confirmed, trigger the receipt email and release full-resolution deliverables.

### 2. Image Watermarking (Edge Function)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| imagemagick_deno | 0.0.31 | Image watermarking in Supabase edge functions | Supabase officially recommends this WASM library for image manipulation in edge functions. It is the ImageMagick port for Deno with composite/overlay support. Sharp and libvips require native binaries and will crash on Deno Deploy. |

**Import pattern for new edge function:**
```typescript
import {
  ImageMagick,
  IMagickImage,
  initialize,
  MagickFormat,
  MagickGeometry,
  Gravity,
} from "https://deno.land/x/imagemagick_deno@0.0.31/mod.ts";

await initialize();
```

**Watermark approach:** Use `IMagickImage.composite()` to overlay a semi-transparent text watermark or PNG logo onto delivery preview images. Read source images from Supabase Storage (`drone_assets` bucket), resize to preview dimensions (1200px wide max), apply watermark, write to a `previews` path or bucket.

**Memory constraint:** Supabase edge functions have a 512 MB memory limit and 150 second idle timeout. DJI aerial photos are typically 20-40 MP (15-30 MB each). Process one image at a time and resize to preview dimensions before watermarking. Do not attempt to watermark full-resolution originals in an edge function.

**New edge function:** `watermark-preview`

### 3. Accessories CRUD UI

**No new libraries needed.** The `accessories` table already exists in the schema with:
- Full column set: name, type (enum), serial_number, status, compatible_aircraft, notes, purchased_at
- RLS policies for admin CRUD and pilot read
- Updated_at trigger
- `accessory_type` enum: filter, prop, mount, case, charger, tablet, sd_card, other

The admin UI uses existing libraries:

| Existing Library | Role in Accessories |
|-----------------|---------------------|
| @tanstack/react-query | CRUD operations with useQuery/useMutation hooks |
| react-hook-form + zod | Add/edit form validation |
| shadcn/ui (Table, Dialog, Select, Input) | List view, modal forms, type dropdown |
| sonner | Toast notifications for create/update/delete |
| lucide-react | Category icons per accessory type |

The `pullFleet()` function in the sync engine already pulls accessories data for offline caching. No backend changes needed.

### 4. Offline Flight Log Queueing

**No new libraries needed.** The infrastructure is built and working:

- `src/lib/sync/db.ts` defines IndexedDB stores and queue operations
- `src/lib/sync/sync-engine.ts` implements `processQueue()`, `startAutoSync()`, connectivity detection, retry with backoff
- `SyncAction` type already includes `insert_flight_log`
- `executeAction()` already handles `insert_flight_log` via `supabase.from(table).insert(payload)`

**What is missing is integration wiring, not infrastructure:**

1. Flight log form component needs to detect `navigator.onLine` and call `addToSyncQueue()` when offline instead of direct Supabase insert
2. Pilot portal layout needs to call `startAutoSync()` on mount
3. A `SyncStatusIndicator` component needs to display queue depth and sync state (idle/syncing/error/offline) using `onSyncStatusChange()` listener
4. Success/error toasts after sync completes

Zero new npm packages. Zero new edge functions. Pure React component work.

### 5. Production PWA Icons

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| @vite-pwa/assets-generator | latest | Generate all required icon sizes from a single source SVG or high-res PNG | One-time dev dependency. Run once to produce all sizes, then remove or keep for future regeneration. |

**Current state:** `public/pwa-192x192.png` (192x192 RGBA PNG) and `public/pwa-512x512.png` (512x512 RGBA PNG) exist. SVG variants also exist. The manifest in `vite.config.ts` references both PNGs correctly including a maskable variant.

**What needs to happen:** Replace placeholder PNGs with branded Sentinel/Trestle icons. The vite.config.ts manifest configuration is already correct and does not need changes.

**Required icon set:**

| Size | Purpose | File |
|------|---------|------|
| 192x192 | Chrome/Android installable PWA minimum | pwa-192x192.png |
| 512x512 | Chrome/Android installable PWA + splash | pwa-512x512.png |
| 512x512 maskable | Android adaptive icon (circular crop safe) | pwa-512x512.png (already dual-listed in manifest with purpose: maskable) |
| 180x180 | Apple touch icon (iOS home screen) | apple-touch-icon.png (add link tag to index.html) |

**Maskable safe zone:** Keep critical content (logo, text) within the center 80% of the canvas. For 512x512 that means the center 410x410 pixels. The outer 10% on each side gets cropped by platform icon masks (circular on Android, rounded square on iOS, squircle on Samsung).

### 6. Vercel Standalone Deployment

**No new libraries or configuration changes needed in code.** The existing `vercel.json` handles SPA rewrites and security headers correctly.

| Item | Current State | Action |
|------|---------------|--------|
| vercel.json | Complete with SPA rewrite + security headers | No changes |
| Custom domain | Not configured | Add `trestle.sentinelaerial.com` in Vercel project settings |
| DNS | Not configured | Add CNAME record: `trestle` pointing to `cname.vercel-dns.com` |
| SSL | Automatic | Vercel provisions and renews SSL for custom domains automatically |
| Environment variables | Set for current deployment | Copy VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to new project if using a separate Vercel project |

**Deployment options:**

**Option A (recommended): Same Vercel project, add domain.** Add `trestle.sentinelaerial.com` as an additional domain to the existing Vercel project. Simplest approach. Both domains serve the same build. The app already routes correctly based on URL path (`/pilot/*` for Trestle, `/admin/*` for admin, `/` for landing).

**Option B: Separate Vercel project.** Create a new Vercel project pointed at the same repo. Useful if you want independent deployments or different environment variables. Requires duplicating env var configuration.

---

## Installation

```bash
# Dev dependency for PWA icon generation (one-time use)
npm install -D @vite-pwa/assets-generator

# No runtime dependencies to add
# All new functionality uses existing npm packages or Deno imports in edge functions
```

**Total new npm packages: 1 (dev only)**

---

## New Edge Functions Required

| Function | Purpose | Key Dependencies |
|----------|---------|------------------|
| create-balance-invoice | Create Square invoice for remaining balance after watermarked previews delivered | Square REST API (fetch), Supabase client |
| watermark-preview | Generate watermarked preview thumbnails from processed deliverables | imagemagick_deno@0.0.31, Supabase Storage |
| payment-receipt-email | Send final receipt via Resend and release full-resolution deliverables | Resend npm:resend@2.0.0, Supabase client |

All follow the existing edge function pattern: `serve()` from `deno.land/std@0.190.0/http/server.ts`, CORS headers object, `createClient()` with service role key, try/catch with status codes.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| imagemagick_deno (WASM) | Sharp | Never in Supabase edge functions. Sharp requires native binaries. Use only if moving watermarking to a Node.js server or Vercel serverless function. |
| imagemagick_deno (WASM) | Supabase Storage image transformations | If only resizing is needed (crop, format conversion). Storage transformations do not support composite/overlay operations needed for watermarking. |
| imagemagick_deno (WASM) | deno-canvas (Skia WASM port) | If you need programmatic 2D drawing rather than photo manipulation. Less mature for photo processing. No official Supabase recommendation. |
| Raw fetch() for Square API | Square Node SDK | Never in Deno edge functions. The SDK depends on Node.js APIs. Raw fetch is already proven in two production edge functions. |
| Existing IndexedDB sync engine | Workbox BackgroundSync | If the current engine had reliability issues. Workbox BackgroundSync retries from the service worker layer, but the current application-layer engine gives better conflict detection and error reporting. |
| @vite-pwa/assets-generator | Manual icon export from Figma/Photoshop | If a designer wants pixel-perfect control over each size. For a solo operator the generator is faster and produces correct maskable safe zones automatically. |
| Same Vercel project + domain | Separate Vercel project | If Trestle needs independent deployment cadence, different env vars, or separate analytics. Adds configuration overhead. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Square Node SDK | Cannot run in Deno runtime. Depends on Node.js APIs. | Raw fetch() against Square REST API (proven in create-deposit-invoice and square-webhook) |
| Sharp / libvips | Native binary dependencies crash on Deno Deploy | imagemagick_deno (WASM-based, Supabase recommended) |
| Canvas API (deno-canvas) for watermarking | Less mature, fewer format options, no official Supabase endorsement | imagemagick_deno |
| New state management library | Existing react-query + React state covers all needs including accessories CRUD | @tanstack/react-query for server state |
| idb (IndexedDB wrapper) | Custom sync engine already works with raw IndexedDB. Adding a wrapper creates two patterns for the same stores. | Existing db.ts helpers (getAll, put, putAll, remove, clearStore) |
| Separate backend server for watermarking | Over-engineering. Edge function handles preview-sized images within 512 MB memory limit. | Supabase edge function with imagemagick_deno |
| Payment gateway other than Square | Square is already integrated with two working edge functions, webhook signature validation, and env vars configured | Extend existing Square integration |
| Stripe for balance payments | Would require a second payment gateway alongside Square. All existing payment infrastructure is Square. | Square Invoices API for both deposit and balance |
| react-native or Capacitor | PWA already covers mobile needs. Explicitly out of scope per PROJECT.md. | vite-plugin-pwa (already configured) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| imagemagick_deno@0.0.31 | Deno Deploy (Supabase edge functions) | WASM binary included, no native dependencies. Import from deno.land/x registry. |
| Square API 2025-10-16 | Existing fetch() pattern in edge functions | Backward compatible with current code. Same endpoint URLs, same request/response shape. Only the Square-Version header value changes. |
| @vite-pwa/assets-generator | vite-plugin-pwa ^1.2.0, Vite ^5.4.1 | Same maintainer ecosystem (antfu). Dev-only, does not affect runtime. |
| npm:resend@2.0.0 | Deno edge functions | Already used in drone-delivery-email. Same version for payment-receipt-email. |

---

## Sources

- [Square Invoices API Reference](https://developer.squareup.com/reference/square/invoices-api) -- API version 2025-10-16 confirmed as latest, BALANCE request type documented (HIGH confidence)
- [Square Create Invoice endpoint](https://developer.squareup.com/reference/square/invoices-api/create-invoice) -- request shape, payment_requests array, idempotency_key (HIGH confidence)
- [Square Publish Invoice endpoint](https://developer.squareup.com/reference/square/invoices-api/publish-invoice) -- version field required for publish (HIGH confidence)
- [Supabase Edge Function Image Manipulation guide](https://supabase.com/docs/guides/functions/examples/image-manipulation) -- magick-wasm recommended, Sharp not supported (HIGH confidence)
- [Supabase Edge Function Limits](https://supabase.com/docs/guides/functions/limits) -- 512 MB memory, 150s idle timeout, 20 MB bundle limit (HIGH confidence)
- [imagemagick_deno on deno.land](https://deno.land/x/imagemagick_deno@0.0.31) -- version 0.0.31 latest (MEDIUM confidence, verify at build time)
- [Supabase WASM modules guide](https://supabase.com/docs/guides/functions/wasm) -- WASM-only constraint for image processing (HIGH confidence)
- [Vite PWA Minimal Requirements](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html) -- 192x192 and 512x512 minimum for installable PWA (HIGH confidence)
- [MDN PWA Icon Requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons) -- maskable safe zone 80% center, purpose attribute (HIGH confidence)
- [Vercel Custom Domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain) -- CNAME for subdomains, automatic SSL provisioning (HIGH confidence)
- Existing codebase: `create-deposit-invoice/index.ts`, `square-webhook/index.ts`, `drone-delivery-email/index.ts`, `src/lib/sync/db.ts`, `src/lib/sync/sync-engine.ts` (PRIMARY source, highest confidence)

---
*Stack research for: Faith and Harmony Operations Platform v2.0 (billing, watermarking, accessories, offline sync, PWA icons, Vercel deployment)*
*Researched: 2026-03-05*
