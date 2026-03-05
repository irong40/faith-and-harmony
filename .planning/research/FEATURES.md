# Feature Research

**Domain:** Drone service business operations platform (billing lifecycle, equipment management, offline ops, deployment)
**Researched:** 2026-03-05
**Confidence:** HIGH

---

## Scope Note

This file covers only the NEW features for v2.0. The voice bot pipeline, scheduling, weather ops, admin portal, pilot portal, PWA infrastructure, and landing page are already built and out of scope. Features below extend the existing foundation to close the gap between "job completed" and "money collected, deliverables released."

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the admin and pilot expect. Missing these means the platform cannot run paid jobs end to end.

| Feature | Why Expected | Complexity | Dependency on Existing |
|---------|--------------|------------|----------------------|
| Deposit invoice creation via Square | Cannot collect payment without it. Client accepts quote, admin triggers deposit. | LOW | `create-deposit-invoice` edge function EXISTS. Creates Square invoice, publishes, inserts payments row. Description says 25% but PROJECT.md says 50%. The `deposit_amount` field on quotes controls the actual amount. Verify quote creation sets it to 50%. |
| Square webhook payment confirmation | Must know when deposit or balance is paid to advance the job lifecycle. | LOW | `square-webhook` edge function EXISTS. Handles `invoice.payment_made`, marks payment as `paid`, idempotent. Has TODO comment for receipt email trigger on balance payment. |
| Balance invoice creation after delivery | Cannot collect remaining payment. Client receives previews, gets balance invoice with Square payment link. | MEDIUM | No edge function exists. Needs `create-balance-invoice` mirroring deposit flow with `payment_type: 'balance'` and `due_date` set to delivery + 15 days. Schema supports Net 15 (migration comments confirm). |
| Watermarked preview delivery email | Clients need to see what they are paying for. Protects full resolution files until payment clears. | MEDIUM | `drone-delivery-email` EXISTS but delivers full resolution via Google Drive. Needs a separate "preview with balance due" variant that sends 2-3 watermarked thumbnail images inline plus the Square payment link. No watermark generation exists anywhere in the codebase. |
| Auto receipt email after final payment | Professional service expectation. Client pays balance, gets receipt confirming payment and link to full resolution files. | MEDIUM | Square webhook has the TODO. Needs a `payment-receipt-email` edge function triggered when balance status becomes `paid`. Should also trigger full res delivery via existing `drone-delivery-email`. |
| Accessories CRUD in admin UI | Accessories table and TypeScript types exist. `pullFleet()` already fetches accessories. MissionEquipment has `accessory_ids`. No admin page to create, edit, or delete accessories. | MEDIUM | Fleet types define `Accessory` interface with 8 types (filter, lens, propeller, case, charger, antenna, mount, other). Need admin page following existing aircraft/battery/controller CRUD pattern. |
| Admin payments panel | Admin needs to see deposit paid/pending, balance paid/pending/overdue per job at a glance. | MEDIUM | `payments` table with status enum (pending, paid, overdue, waived) exists. Overdue cron job exists. Need UI component on job detail or a dedicated billing dashboard. |
| Production PWA icons | SVG placeholders and PNG files exist in `public/`. Professional branding requires proper maskable icons with Sentinel logo and colors. | LOW | Replace `pwa-192x192.svg` and `pwa-512x512.svg` with branded assets. Verify existing PNGs are production quality. Update manifest if needed. |
| Standalone Vercel deployment at subdomain | Pilot PWA needs its own subdomain for clean install experience and brand identity. | LOW | Already deployed to Vercel. Add DNS CNAME for `trestle.sentinelaerial.com`. Add domain in Vercel project settings. |

### Differentiators (Competitive Advantage)

Features that set the platform apart from manual invoicing and spreadsheet tracking.

| Feature | Value Proposition | Complexity | Dependency on Existing |
|---------|-------------------|------------|----------------------|
| Automated end-to-end billing lifecycle | Zero manual email drafting across the entire quote-to-payment flow. Admin clicks one button per stage. Client gets branded emails at each step. Most drone operators manage this with spreadsheets and manual Square invoices. | HIGH (integration) | This is the orchestration layer tying 4-5 edge functions, the payments table, and job status transitions. Individual pieces are MEDIUM but full lifecycle integration is the value. |
| Offline flight log queueing with automatic sync | Pilot logs flights at remote sites with no cell service. Data queues in IndexedDB and syncs automatically when connectivity returns. Most field service apps require connectivity. | LOW | Already 90% built. `PilotMissionDetail` queues `insert_flight_log` to IndexedDB offline. Sync engine processes on reconnect with retry. Gap is verification of the full path and UI feedback (sync status indicator, pending count). |
| Payment-gated deliverable release | Full resolution files only released after balance payment confirmed via Square webhook. Automated, no manual checking. Prevents the "client has files but has not paid" problem common in creative services. | MEDIUM | Requires balance webhook handling to trigger `drone-delivery-email` for full res. Customer portal (`drone-customer-portal`) exists but has no payment awareness. |
| Equipment compatibility tracking for accessories | Accessories linked to compatible aircraft. Mission equipment selection filters accessories by selected aircraft. Prevents wrong gear packed for a job. | LOW | `Accessory.compatible_aircraft` (string array) and `MissionEquipment.accessory_ids` already in schema. Need UI for setting compatibility during accessory creation and filtering during mission equipment selection. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Client login portal for job tracking | "Clients should see their job status" | Single pilot operation with 5-15 active jobs. Building auth, password reset, and a client dashboard adds massive scope for minimal value. Clients rarely check portals. | Token-based delivery page already exists (`drone-customer-portal`). Clients get a unique link in email. No login required. |
| Configurable deposit percentage per job | "Different jobs need different deposit amounts" | Adds UI complexity, decision fatigue, edge cases. Fixed percentage is predictable for both business and client. | Fixed 50% deposit. Handle exceptions manually outside the platform. |
| Real-time payment notifications via WebSocket | "Admin should see payments the instant they clear" | Square webhooks already fire within seconds. WebSocket infrastructure for one admin user adds complexity with zero practical benefit. | Admin refreshes the payments panel or gets an email notification. Webhook processes in under 5 seconds. |
| Server-side on-demand watermark generation | "Generate watermarks dynamically per image on request" | Requires image processing in Deno edge functions (Sharp/ImageMagick) or a separate processing service. Adds latency, storage duplication, and failure modes. | Generate watermarked thumbnails during the existing processing pipeline (`drone-batch-qa` or `drone-upload-processed`). Store alongside originals. Serve static watermarked files in the preview email. One-time cost at processing, zero cost at delivery. |
| Partial payment tracking | "What if the client pays 30% instead of 50%" | Square invoices are pay-in-full. Partial payments create reconciliation nightmares. The two-invoice model is deliberately simple. | Two invoices only (deposit and balance). If a client underpays, Square tracks it as an incomplete invoice. |
| Multi-currency support | "International clients" | Hampton Roads local service business. All quotes USD. Square account USD. | USD only. |

---

## Feature Dependencies

```
[Quote Accepted by Client]
    |
    v
[Deposit Invoice Creation] ----uses----> payments table (EXISTS)
    |                                     create-deposit-invoice (EXISTS)
    v
[Square Webhook: Deposit Paid] ----uses----> square-webhook (EXISTS)
    |
    v
[Mission Scheduled, Flown, Processed]
    |
    v
[Watermarked Preview Generation] ----NEEDS BUILD----> (processing pipeline addition)
    |
    v
[Balance Due Email + Balance Invoice]
    |   ----NEEDS BUILD----> create-balance-invoice edge function
    |   ----NEEDS BUILD----> balance-due-email edge function (or variant of drone-delivery-email)
    v
[Square Webhook: Balance Paid] ----uses----> square-webhook (EXISTS, needs balance trigger)
    |
    v
[Receipt Email + Full Res Delivery]
        ----NEEDS BUILD----> payment-receipt-email edge function
        ----uses----> drone-delivery-email (EXISTS, for full res release)


[Accessories CRUD] ----independent of billing----
    uses: accessories table (EXISTS), fleet types (EXISTS), pullFleet (EXISTS)

[Offline Flight Log Queueing] ----independent of billing----
    uses: sync engine (EXISTS), IndexedDB stores (EXISTS), PilotMissionDetail offline path (EXISTS)

[PWA Icons] ----independent----
    design/asset task only

[Vercel Subdomain] ----independent----
    DNS/config task only
```

### Dependency Notes

- **Balance invoice requires watermarked previews first.** The balance due email must include preview thumbnails so the client sees what they pay for. Watermarks must be generated during processing before the balance email fires.
- **Receipt email requires balance webhook wiring.** The `square-webhook` function has a TODO for triggering receipt email when balance is paid. This connection must be built before the full lifecycle works.
- **Accessories CRUD is fully independent.** No dependency on billing. Can be built in parallel or in any phase order.
- **Offline queueing is fully independent.** Already 90% functional. Verification and UI polish fit anywhere in the timeline.
- **PWA icons and Vercel subdomain are independent.** Pure configuration and asset tasks with no code dependencies.

---

## MVP Definition

### Launch With (v2.0)

The minimum to run a paid job from quote acceptance through deliverable release.

- [ ] Verify and fix deposit amount (50% not 25%) in quote creation flow
- [ ] Balance invoice creation edge function (`create-balance-invoice`)
- [ ] Watermarked thumbnail generation in processing pipeline
- [ ] Balance due email with watermarked previews and Square payment link
- [ ] Wire square-webhook balance payment to trigger receipt email and full res delivery
- [ ] Receipt email edge function (`payment-receipt-email`)
- [ ] Admin payments panel showing deposit/balance status per job
- [ ] Accessories CRUD admin page (list, create, edit, delete, compatibility)
- [ ] Production PWA icons with Sentinel branding
- [ ] Vercel subdomain configuration for `trestle.sentinelaerial.com`

### Add After Validation (v2.x)

Features to add once the billing lifecycle runs in production with real clients.

- [ ] Overdue payment reminder emails (cron marks overdue but no notification fires)
- [ ] Payment history and ledger view in admin
- [ ] Accessory maintenance logging (maintenance_log table supports accessories via `equipment_type`)
- [ ] Sync status indicator in pilot PWA (pending count badge, last sync timestamp)
- [ ] Customer portal payment awareness (show balance status on token-based delivery page)

### Future Consideration (v3+)

- [ ] Client-facing payment history page (token-based, no login)
- [ ] Automated follow-up email sequences for unpaid balances
- [ ] Equipment utilization reporting and cost tracking
- [ ] Batch invoice creation for retainer clients

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Deposit amount fix (50%) | HIGH | LOW | P1 |
| Balance invoice creation | HIGH | LOW | P1 |
| Watermarked preview generation | HIGH | MEDIUM | P1 |
| Balance due email with previews | HIGH | MEDIUM | P1 |
| Receipt email after balance paid | HIGH | LOW | P1 |
| Full res delivery gated on payment | HIGH | LOW | P1 |
| Admin payments panel | HIGH | MEDIUM | P1 |
| Accessories CRUD admin page | MEDIUM | MEDIUM | P1 |
| Production PWA icons | MEDIUM | LOW | P1 |
| Vercel subdomain config | MEDIUM | LOW | P1 |
| Offline flight log verification | MEDIUM | LOW | P2 |
| Sync status UI indicator | LOW | LOW | P2 |
| Overdue reminder emails | MEDIUM | LOW | P2 |
| Payment history view | LOW | MEDIUM | P3 |
| Customer portal payment awareness | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v2.0 launch (blocks revenue collection)
- P2: Should have, add once billing lifecycle is validated in production
- P3: Nice to have, future milestone

---

## Existing Infrastructure Inventory

What already exists and should be leveraged, not rebuilt.

| Component | Status | Location | Gaps |
|-----------|--------|----------|------|
| payments table | Complete | `20260226120000_payments.sql` | Enums, RLS, indexes, overdue cron all in place. No gaps. |
| create-deposit-invoice | Complete | `supabase/functions/create-deposit-invoice/` | Works. Description text says 25% but actual amount comes from `quote.deposit_amount`. Verify quote creation logic. |
| square-webhook | Complete | `supabase/functions/square-webhook/` | Handles `invoice.payment_made`, marks paid, idempotent. Has TODO for receipt trigger on balance. |
| drone-delivery-email | Complete | `supabase/functions/drone-delivery-email/` | Full resolution delivery via Resend with branded HTML. Sends Google Drive links. Needs a separate preview variant for balance due. |
| drone-customer-portal | Complete | `supabase/functions/drone-customer-portal/` | Token-based access to job details, gallery, downloads, receipt confirmation. No payment status awareness. |
| IndexedDB sync engine | Complete | `src/lib/sync/sync-engine.ts` + `db.ts` | Queue, retry (max 5), 30s auto-sync, online event listener. Supports `insert_flight_log`. |
| Flight log offline path | Complete | `src/pages/pilot/PilotMissionDetail.tsx` | Queues flight log insert and equipment upsert when offline. Needs end-to-end integration test. |
| Fleet types | Complete | `src/types/fleet.ts` | Accessory interface with 8 types, MissionEquipment with `accessory_ids`. |
| Accessory data pull | Complete | `pullFleet()` in sync-engine | Already fetches accessories table for offline cache. |
| PWA config | Complete | vite-plugin-pwa | SVG and PNG icon files in `public/`. Need branded production assets. |

---

## Sources

- Codebase analysis of `D:\Projects\FaithandHarmony\` (PRIMARY source for all findings)
- `supabase/functions/create-deposit-invoice/index.ts` (deposit flow implementation)
- `supabase/functions/square-webhook/index.ts` (payment webhook implementation)
- `supabase/functions/drone-delivery-email/index.ts` (delivery email implementation)
- `supabase/functions/drone-customer-portal/index.ts` (client portal implementation)
- `supabase/migrations/20260226120000_payments.sql` (payments schema, RLS, cron)
- `src/lib/sync/sync-engine.ts` and `src/lib/sync/db.ts` (offline sync architecture)
- `src/types/fleet.ts` (equipment and accessory type definitions)
- `src/pages/pilot/PilotMissionDetail.tsx` (flight log offline queueing implementation)

---

*Feature research for: Faith and Harmony Operations Platform v2.0 — Billing, Equipment, Production Readiness*
*Researched: 2026-03-05*
