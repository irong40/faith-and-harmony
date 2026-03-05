# Architecture Research

**Domain:** Drone operations platform v2.0 integration (billing, accessories, offline queueing, PWA icons, standalone deployment)
**Researched:** 2026-03-05
**Confidence:** HIGH

## System Overview

```
+---------------------------------------------------------------+
|                    Client (React SPA)                         |
|  +----------+  +-----------+  +----------+  +-----------+    |
|  | Landing  |  | Admin     |  | Pilot    |  | PWA       |    |
|  | Pages    |  | Portal    |  | Portal   |  | Shell     |    |
|  +----+-----+  +----+------+  +----+-----+  +----+------+    |
|       |              |              |              |          |
+-------+--------------+--------------+--------------+----------+
        |              |              |              |
+-------+--------------+--------------+--------------+----------+
|                    Service Layer                              |
|  +----------+  +-----------+  +-----------+  +----------+    |
|  | Supabase |  | Sync      |  | React     |  | Workbox  |    |
|  | Client   |  | Engine    |  | Query     |  | SW       |    |
|  +----+-----+  +----+------+  +----+------+  +----+-----+    |
|       |              |              |              |          |
+-------+--------------+--------------+--------------+----------+
        |              |              |
+-------+--------------+--------------+---+
|       IndexedDB (trestle_offline)       |
|  +------------+ +----------+ +-------+  |
|  | sync_queue | | missions | | fleet |  |
|  +------------+ +----------+ +-------+  |
+-----------------------------------------+
        |
+-------+-----------------------------------------+
|            Supabase (shared instance)           |
|  +--------+  +----------+  +--------+          |
|  | Auth   |  | Postgres |  | Storage|          |
|  +--------+  +----------+  +--------+          |
|  | 41 Edge Functions                 |          |
|  +-----------------------------------+          |
+-------+-----------------------------------------+
        |
+-------+-----------------------------------------+
|            External Services                    |
|  +--------+  +--------+  +--------+  +------+  |
|  | Square |  | Resend |  | n8n    |  | Vapi |  |
|  +--------+  +--------+  +--------+  +------+  |
+-------------------------------------------------+
```

### What Already Exists vs What Gets Added

| Component | Status | v2.0 Changes |
|-----------|--------|-------------|
| `payments` table | EXISTS | No schema changes. Wire up balance invoice creation and receipt email triggers. |
| `square-webhook` edge function | EXISTS | Add balance payment handling. Currently only processes `invoice.payment_made` for deposits. TODO comment at line 183 marks the gap. |
| `create-deposit-invoice` edge function | EXISTS | Working. Creates Square invoice, publishes it, inserts `payments` row. |
| `drone-delivery-email` edge function | EXISTS | Needs a parallel "balance due" variant that sends watermarked previews instead of full deliverables. |
| `accessories` table | EXISTS | Schema exists. `pullFleet()` already fetches accessories. |
| Accessories UI components | EXISTS | `AccessoryFormDialog`, `FleetOverview` with CRUD. No standalone management page. |
| Sync engine | EXISTS | `insert_flight_log` action defined. Offline queueing partially wired in `PilotMissionDetail`. |
| PWA manifest | EXISTS | References `pwa-192x192.png` and `pwa-512x512.png`. Both PNG files exist in `/public/`. |
| Vercel config | EXISTS | SPA rewrites and security headers configured. Single deployment. |

### Component Responsibilities

| Component | Responsibility | v2.0 Integration Point |
|-----------|----------------|------------------------|
| `create-deposit-invoice` | Creates Square deposit invoice after quote acceptance | None. Already working. |
| NEW `create-balance-invoice` | Creates Square balance invoice after processing complete | New edge function. Mirrors deposit pattern. |
| NEW `send-balance-due-email` | Sends watermarked preview email with Square payment link | New edge function. Combines `drone-delivery-email` template with watermarked image URLs. |
| NEW `send-payment-receipt` | Sends receipt and releases full resolution deliverables | New edge function. Triggered by `square-webhook` when balance is paid. |
| `square-webhook` | Processes `invoice.payment_made` events from Square | Extend to call `send-payment-receipt` when balance payment completes. |
| `FleetOverview` | Displays all equipment types including accessories | Already renders accessories tab. Needs standalone admin page route. |
| Sync Engine | Queues offline writes, processes on reconnect | Flight log queueing already coded. Needs end-to-end verification. |
| PWA manifest | Defines icons, display mode, start URL | Replace placeholder PNGs with branded Sentinel icons. |

## New Components to Build

### 1. Balance Invoice Edge Function (`create-balance-invoice`)

Mirrors `create-deposit-invoice`. Key differences from the deposit function.

- Triggered after deliverables are processed (not after quote acceptance)
- Amount is `total - deposit_amount` (the remaining balance)
- Payment type is `'balance'` in the `payments` table
- Sets `due_date` to delivery date + 15 days (Net 15)
- Sends balance due email with watermarked previews instead of Square's default email

```typescript
// Pattern: same as create-deposit-invoice but for balance
// Input: { job_id: string } (not quote_id, since we're past the quoting phase)
// Steps:
//   1. Look up drone_job -> quote -> payments (deposit must be paid)
//   2. Calculate balance = quote.total - deposit.amount
//   3. Create Square invoice for balance
//   4. Publish Square invoice
//   5. Insert payments row (payment_type: 'balance')
//   6. Call send-balance-due-email with watermarked preview URLs
```

### 2. Balance Due Email with Watermarked Previews (`send-balance-due-email`)

New edge function. Sends 2-3 watermarked preview thumbnails with a Square payment link.

**Watermarking approach.** The platform already stores processed deliverables in Supabase Storage via the n8n pipeline. Watermarking should happen at the edge function level using Supabase Storage image transformations or a lightweight canvas library in the Deno edge function. The simplest approach is to use Supabase Storage's built-in image transformation with a watermark overlay, but Supabase does not support watermark overlays natively. Two viable alternatives exist.

**Option A (recommended).** Generate watermarked versions during the n8n processing pipeline. Store them in a separate `watermarked/` prefix in the same storage bucket. The edge function references these URLs directly. This keeps the edge function simple and leverages the existing local processing rig's compute power.

**Option B.** Use a canvas library in the Deno edge function to overlay a "PREVIEW" watermark on fetched images. This adds processing time and memory pressure to the edge function. Not recommended for large aerial photos.

```typescript
// send-balance-due-email pattern:
// Input: { job_id: string, preview_urls: string[], square_invoice_url: string }
// Template: reuse drone-delivery-email layout but:
//   - Replace "Deliverables Ready" banner with "Balance Due"
//   - Embed 2-3 watermarked preview thumbnails inline
//   - Primary CTA = Square payment link (not Google Drive)
//   - Add "Full resolution files released after payment" note
```

### 3. Payment Receipt and Deliverable Release (`send-payment-receipt`)

Triggered by `square-webhook` when `payment_type === 'balance'` and status becomes `'paid'`.

```typescript
// Triggered from square-webhook after balance payment:
// 1. Send receipt email via Resend (branded, shows both deposit + balance)
// 2. Call drone-delivery-email to send full resolution deliverables
// 3. Update drone_jobs.status to 'delivered' if not already
```

### 4. Accessories Management Page

The `FleetOverview` component already handles accessories with full CRUD via `AccessoryFormDialog`. The gap is that accessories are buried in the fleet page. The v2.0 change is routing and navigation only.

```
Admin Portal route additions:
/admin/fleet              -> FleetOverview (already exists, has accessories tab)
/admin/fleet/accessories  -> Optional: dedicated view filtered to accessories only

No new components needed. Wire an admin nav link to existing FleetOverview.
```

The `AccessoryType` enum already covers the required types: `filter`, `lens`, `propeller`, `case`, `charger`, `antenna`, `mount`, `other`. The `compatible_aircraft` field links accessories to specific drones. This is sufficient for the target equipment list (props, RTK, chargers, tablets, SD cards). Tablets and SD cards map to `other` type. If a dedicated type is needed, add to the `AccessoryType` union and update the form select options.

### 5. Offline Flight Log Queueing (End-to-End)

The pieces exist but need verification of the full chain.

**What exists.**
- `PilotMissionDetail.tsx` line 158-175: offline branch calls `addToSyncQueue` with `insert_flight_log` action
- `sync-engine.ts` line 31-34: `insert_flight_log` handler inserts into `flight_logs` table
- `startAutoSync()`: periodic queue processing with online event listener
- `pullMissions()`: pulls mission data into IndexedDB for offline access

**What needs verification/completion.**
- Confirm `startAutoSync()` is called on pilot portal mount (app lifecycle)
- Confirm `pullFleet()` is called alongside `pullMissions()` so equipment selector works offline
- Confirm mission equipment upsert also queues offline (the `upsert_equipment` action exists)
- Test the full cycle: go offline, complete checklist, log flight, go online, verify sync

**Likely gap.** The `PilotMissionDetail` component branches on `navigator.onLine` at submission time. If the pilot loads the page online then loses connectivity before submitting, the Supabase client call will fail. The offline branch catches this by checking `navigator.onLine`, but network state detection can lag. A more robust pattern wraps the online Supabase call in a try/catch that falls back to the sync queue on network error.

```typescript
// Robust offline fallback pattern:
try {
  if (!navigator.onLine) throw new Error('offline');
  const { error } = await supabase.from('flight_logs').insert(payload);
  if (error) throw error;
} catch (err) {
  // Network error or explicit offline: queue for sync
  await addToSyncQueue({
    action: 'insert_flight_log',
    table: 'flight_logs',
    payload,
    created_at: new Date().toISOString(),
    retries: 0,
    last_error: null,
  });
}
```

## Data Flow

### Billing Flow (Complete Lifecycle)

```
Quote Accepted
    |
    v
create-deposit-invoice (existing)
    |  Creates Square invoice + payments row (deposit, pending)
    v
Square emails client -> Client pays deposit
    |
    v
square-webhook (existing)
    |  Updates payments.status = 'paid', sets paid_at
    v
Mission Scheduled + Executed
    |
    v
n8n Pipeline Processes Deliverables
    |  Generates watermarked previews (store in Storage)
    v
create-balance-invoice (NEW)
    |  Creates Square invoice + payments row (balance, pending)
    |  Sets due_date = now() + 15 days
    v
send-balance-due-email (NEW)
    |  Sends watermarked previews + Square payment link
    v
Client pays balance
    |
    v
square-webhook -> send-payment-receipt (NEW)
    |  Sends receipt email
    |  Triggers drone-delivery-email (existing) for full deliverables
    v
Done
```

### Flight Log Offline Queueing Flow

```
Pilot opens mission detail (online)
    |
    v
pullMissions() + pullFleet() -> IndexedDB cached
    |
    v
Pilot goes to field (may lose connectivity)
    |
    v
Completes checklist (reads from IndexedDB cache)
    |
    v
Submits flight log
    |
    +-- Online? -> supabase.from('flight_logs').insert()
    |
    +-- Offline? -> addToSyncQueue('insert_flight_log')
                        |
                        v
                    Background sync (30s interval or online event)
                        |
                        v
                    processQueue() -> supabase.from('flight_logs').insert()
```

### Standalone Deployment Flow

```
Main repo (faithandharmony)
    |
    +-- Vercel Project A: sentinelaerialinspections.com
    |     Routes: /, /admin/*, /login
    |     Same codebase, same build
    |
    +-- Vercel Project B: trestle.sentinelaerial.com (NEW)
          Routes: /pilot/*, /login
          Same codebase, same build
          PWA: start_url = /pilot, standalone display
```

## Architectural Patterns

### Pattern 1: Edge Function Chain for Multi-Step Workflows

**What.** One edge function triggers another via direct Supabase function invocation rather than trying to do everything in one function.

**When to use.** The billing flow requires multiple steps (create invoice, send email, update status). Each step is independently testable and retryable.

**Trade-offs.** Adds latency from sequential function calls. Gains independent failure handling and retry capability. Each function stays under the Deno 150MB memory limit.

**Example from existing code.** The `square-webhook` function processes payment events. The TODO at line 183 says to trigger `send-payment-receipt` after balance payment. This is the chain pattern. The webhook marks the payment as paid, then invokes the receipt function.

```typescript
// In square-webhook, after marking balance as paid:
if (payment.payment_type === 'balance') {
  await fetch(`${SUPABASE_URL}/functions/v1/send-payment-receipt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payment_id: payment.id, quote_id: payment.quote_id }),
  });
}
```

### Pattern 2: Offline-First with Sync Queue

**What.** All writes from the pilot portal go through a try-online-then-queue pattern. IndexedDB stores queued operations with action type, table name, and payload. The sync engine processes the queue on reconnect.

**When to use.** Any pilot portal write operation (flight logs, equipment assignments, mission status updates).

**Trade-offs.** Adds complexity to every write path. The queue is append-only with no conflict resolution beyond the retry/fail-after-5 pattern. This is acceptable because flight logs are insert-only (no concurrent edits) and equipment assignments use delete-then-insert (last writer wins).

### Pattern 3: Shared Codebase, Multiple Deployments

**What.** Same React SPA deployed to two Vercel projects with different domains. Route-level code splitting ensures each deployment only loads relevant code.

**When to use.** When the pilot PWA needs its own domain (trestle.sentinelaerial.com) while the marketing/admin site stays on sentinelaerialinspections.com.

**Trade-offs.** Both deployments build the full codebase. Vite tree-shaking and lazy routes mean unused pages are separate chunks that never load. The trade-off is deployment coordination. Both projects must be redeployed on every push.

## Standalone Deployment Architecture

The standalone Vercel deployment at trestle.sentinelaerial.com requires a second Vercel project pointing at the same GitHub repo. No code changes needed for routing. The existing SPA rewrite rule (`/(.*) -> /index.html`) works for both deployments. React Router handles route matching client-side.

**What changes.**

| Concern | Current | v2.0 |
|---------|---------|------|
| Vercel projects | 1 | 2 (same repo, same build) |
| Domains | sentinelaerialinspections.com | + trestle.sentinelaerial.com |
| PWA manifest | Single manifest | Same manifest works. `start_url: "/pilot"` already set. |
| Service worker scope | `/` | Same. Workbox precaches all routes. |
| Environment variables | Shared Supabase keys | Identical across both deployments |

**Setup steps.**
1. Create new Vercel project linked to same GitHub repo
2. Add trestle.sentinelaerial.com as custom domain
3. Copy all environment variables from existing project
4. Configure same `vercel.json` (already in repo root)
5. Both projects auto-deploy on push to main

**PWA consideration.** The manifest sets `start_url: "/pilot"` and `scope: "/"`. When installed from trestle.sentinelaerial.com, the PWA launches directly into the pilot portal. The admin portal routes still work if navigated to directly, but the PWA UX funnels to pilot flows. No manifest changes needed.

## PWA Icon Strategy

Current state: `pwa-192x192.png` and `pwa-512x512.png` exist as files in `/public/`. SVG source files also exist (`pwa-192x192.svg`, `pwa-512x512.svg`).

**What to do.**
1. Create production-quality PNG icons from the Sentinel Aerial Inspections brand (the main logo or a simplified icon version)
2. Export at 192x192 and 512x512 pixels
3. Replace the existing files in `/public/` (same filenames, no config changes)
4. The manifest already references both sizes including a maskable variant of the 512

**Icon requirements for maskable.** The safe zone for maskable icons is the inner 80% circle. The icon design must have adequate padding so the logo is not clipped when Android applies adaptive icon shapes. Use a solid background color matching `theme_color: "#5B2C6F"` with a white or light logo mark centered.

**Apple touch icon.** The manifest does not include an Apple touch icon. Add `<link rel="apple-touch-icon" href="/pwa-192x192.png">` to `index.html` for iOS home screen support.

## Anti-Patterns

### Anti-Pattern 1: Watermarking at Delivery Time

**What people do.** Apply watermarks in the edge function when sending the balance due email. This means downloading full-resolution aerial photos (10-50MB each) into a Deno edge function, processing them with a canvas library, and uploading the results.

**Why it is wrong.** Edge functions have a 150MB memory limit and a 60-second timeout. Processing 3 high-resolution aerial photos will exceed both limits.

**Do this instead.** Generate watermarked previews during the n8n processing pipeline. The local processing rig has an RTX 5060 Ti and 32GB RAM. Store watermarked versions in Supabase Storage under a `watermarked/` prefix. The edge function just references the URLs.

### Anti-Pattern 2: Separate Codebases for Pilot PWA

**What people do.** Create a separate repo for the pilot-facing PWA to "keep it lean."

**Why it is wrong.** Shared types, shared Supabase client, shared auth context, shared UI components. Splitting creates drift, duplicated dependencies, and coordination overhead. For a single-pilot operation, the overhead is not justified.

**Do this instead.** Deploy the same codebase to a second Vercel project. Lazy route loading ensures the pilot PWA only downloads pilot-relevant chunks. The admin pages are never fetched.

### Anti-Pattern 3: Building a Client Portal

**What people do.** Build a client login/dashboard so clients can view invoices, track job progress, and download deliverables.

**Why it is wrong.** PROJECT.md explicitly marks this out of scope. "Clients interact via email only, no login." Building auth flows, RLS policies, and UI for clients adds weeks of work for a single-pilot operation where email communication is the norm.

**Do this instead.** Keep the email-only flow. Balance due emails contain watermarked previews and a Square payment link. Delivery emails contain a Google Drive link. Receipts go to the same email. No client portal.

## Integration Points

### External Services

| Service | Integration Pattern | v2.0 Changes |
|---------|---------------------|-------------|
| Square | Edge functions call Square REST API. Webhooks hit `square-webhook`. | Add balance invoice creation. Extend webhook to trigger receipt on balance payment. |
| Resend | Edge functions use `npm:resend@2.0.0` for transactional email. | Add balance due email template and receipt email template. |
| n8n | Cloudflare Tunnel to local rig. Triggers processing pipelines. | Add watermark generation step to existing processing pipeline. |
| Supabase Storage | Stores processed deliverables. | Add `watermarked/` prefix for preview images. |

### Internal Boundaries

| Boundary | Communication | v2.0 Notes |
|----------|---------------|-----------|
| Admin Portal to Edge Functions | React Query mutations calling Supabase functions | Add "Create Balance Invoice" button on DroneJobDetail page |
| Pilot Portal to Sync Engine | Direct function calls to `addToSyncQueue` | Verify lifecycle hooks call `startAutoSync()` and `pullFleet()` |
| Square Webhook to Email Functions | Edge function HTTP chain | New chain: webhook -> receipt function -> delivery function |
| n8n to Supabase | REST API calls via Cloudflare Tunnel | Add watermark step that uploads to Storage `watermarked/` prefix |

## Suggested Build Order

Build order is driven by dependency chains and the ability to test each piece independently.

| Order | Feature | Depends On | Rationale |
|-------|---------|------------|-----------|
| 1 | PWA icons | Nothing | Zero risk. Replace files, verify in browser. Quick win. |
| 2 | Accessories management page | Existing FleetOverview | Route and nav link only. Components already exist. |
| 3 | Offline flight log verification | Existing sync engine | Verify end-to-end. Fix the try/catch gap. No new components. |
| 4 | n8n watermark pipeline step | n8n access to local rig | Must exist before balance due email can reference watermarked URLs. |
| 5 | Balance invoice + balance due email | Watermarked previews, payments table | Two new edge functions. Core billing flow. |
| 6 | Payment receipt + deliverable release | Balance invoice flow | Completes the webhook chain. Triggers existing delivery email. |
| 7 | Standalone Vercel deployment | All features working | Deploy only after features are verified on the primary deployment. |

## Sources

- Existing codebase analysis (sync engine, edge functions, types, migrations, vite config, vercel config)
- `payments` migration at `supabase/migrations/20260226120000_payments.sql`
- `square-webhook` edge function with TODO at line 183
- `create-deposit-invoice` edge function (pattern to mirror for balance)
- `drone-delivery-email` edge function (template to adapt for balance due)
- `vite.config.ts` PWA configuration
- `vercel.json` SPA rewrite rules

---
*Architecture research for: Faith and Harmony Operations Platform v2.0*
*Researched: 2026-03-05*
