# Roadmap: Faith & Harmony Operations Platform

## Milestones

- v1.0 Landing Page (Phases 1-5) shipped 2026-02
- v1.1 Voice Bot + Automated Intake Pipeline (Phases 1-6) shipped 2026-03-05
- v2.0 Billing, Equipment, and Production Readiness (Phases 7-11) in progress

## Phases

<details>
<summary>v1.0 Landing Page (Phases 1-5) SHIPPED 2026-02</summary>

See v1.0 roadmap archive.

</details>

<details>
<summary>v1.1 Voice Bot + Automated Intake Pipeline (Phases 1-6) SHIPPED 2026-03-05</summary>

- [x] **Phase 1: Intake API and Lead Tracking** - leads/call_logs tables, intake and pricing edge functions
- [x] **Phase 2: Vapi Voice Bot** - ElevenLabs TTS, system prompt, tool schemas, 757 number
- [x] **Phase 3: n8n Vapi Pipeline** - End-of-call webhook, n8n workflow, intake automation
- [x] **Phase 4: Scheduling and Availability** - Availability slots, blackout dates, admin calendar, bot integration
- [x] **Phase 5: Weather Operations** - NWS forecast, flight parameter checks, admin weather view
- [x] **Phase 6: Integration and Edge Cases** - End-to-end validation, call log and leads pages

</details>

### v2.0 Billing, Equipment, and Production Readiness

**Milestone Goal:** Close all remaining gaps to make the platform production ready with automated billing, complete equipment tracking, reliable offline operations, and standalone Trestle deployment.

- [x] **Phase 7: Foundation and Quick Wins** - PWA icons, accessories admin page, deposit amount verification (completed 2026-03-05)
- [x] **Phase 8: Watermark Pipeline** - Watermarked preview generation and separate storage buckets (completed 2026-03-05)
- [ ] **Phase 9: Billing Lifecycle** - Balance invoice, balance due email, payment webhook, receipt, delivery gate, admin payments panel
- [x] **Phase 10: Offline Sync Hardening** - Dead letter store, persistent warnings, end-to-end flight log sync, try/catch fallback (completed 2026-03-05)
- [ ] **Phase 11: Standalone Deployment** - Vercel subdomain, Supabase auth redirects, Square production cutover

## Phase Details

### Phase 7: Foundation and Quick Wins
**Goal**: Admin can manage all equipment accessories and the PWA uses production branding, establishing the foundation for remaining v2.0 work
**Depends on**: Nothing (independent of billing pipeline)
**Requirements**: DEPLOY-01, EQUIP-01, EQUIP-02, EQUIP-03, BILL-01
**Success Criteria** (what must be TRUE):
  1. Admin can create an accessory with type, name, serial number, and status, then see it listed on the accessories page
  2. Admin can edit and delete accessories, with deletion blocked when the accessory is referenced by a mission
  3. Admin can assign one or more compatible aircraft to an accessory, and mission equipment selection filters accessories by the selected aircraft
  4. The PWA install prompt on Android and iOS shows the Sentinel branded icon instead of an SVG placeholder
  5. Quote creation sets the deposit amount to exactly 50% of the package price
**Plans**: 2 plans
Plans:
- [ ] 07-01-PLAN.md -- Admin accessories page with CRUD, deletion guard, and aircraft multi-select
- [ ] 07-02-PLAN.md -- Deposit percentage fix and PWA icon replacement

### Phase 8: Watermark Pipeline
**Goal**: The processing pipeline generates watermarked preview thumbnails stored separately from originals, ready to be included in balance due emails
**Depends on**: Phase 7 (deposit amount must be correct before billing flow begins)
**Requirements**: BILL-03
**Success Criteria** (what must be TRUE):
  1. After job processing completes, 2 to 3 watermarked preview thumbnails exist in a separate storage bucket (or prefix) from the full resolution originals
  2. Watermarked preview URLs are accessible without authentication while original file URLs require signed access
  3. A watermark overlay is visible on each preview thumbnail and cannot be cropped out to recover the original
**Plans**: 2 plans
Plans:
- [x] 08-01-PLAN.md -- Storage bucket migrations (watermark-previews public bucket, drone-jobs private revert, preview_urls column) and QADetailModal fix
- [ ] 08-02-PLAN.md -- Watermark tile asset generation and n8n WF1 pipeline watermark step

### Phase 9: Billing Lifecycle
**Goal**: The complete billing flow works end-to-end from balance invoice through payment to automatic receipt and deliverable release
**Depends on**: Phase 8 (balance due email needs watermarked preview URLs)
**Requirements**: BILL-02, BILL-04, BILL-05, BILL-06, BILL-07, BILL-08
**Success Criteria** (what must be TRUE):
  1. Admin triggers balance invoice creation from the job detail page, and the Supabase payments row is created before the Square invoice API call (preventing orphaned invoices)
  2. Client receives a balance due email with 2 to 3 watermarked preview thumbnails and a Square payment link
  3. When the client pays the balance via Square, the webhook processes the payment and the job status updates to paid within seconds
  4. Client receives a receipt email after balance payment clears, and full resolution deliverables are released automatically (download links sent)
  5. Admin payments panel shows deposit and balance status per job with paid, pending, and overdue states
**Plans**: TBD

### Phase 10: Offline Sync Hardening
**Goal**: Offline flight log data survives sync failures and the pilot has clear visibility into sync status
**Depends on**: Nothing (independent of billing pipeline)
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. A flight log created while offline appears in IndexedDB and auto-syncs to Supabase when connectivity returns
  2. After max retries, failed sync items move to a dead letter store instead of being silently deleted
  3. Pilot sees a persistent warning banner when dead letter items exist, with the count of stuck items
  4. Sync engine uses try/catch with actual network requests instead of navigator.onLine checks to detect connectivity
**Plans**: 3 plans
Plans:
- [x] 10-01-PLAN.md -- Network probe function and IndexedDB dead letter store infrastructure
- [x] 10-02-PLAN.md -- Sync engine hardening and always-queue flight log pattern
- [x] 10-03-PLAN.md -- Dead letter warning banner and pilot dashboard integration

### Phase 11: Standalone Deployment
**Goal**: Trestle is deployed as a standalone app at trestle.sentinelaerial.com with production payment processing
**Depends on**: Phase 9 (billing must work before Square production cutover), Phase 10 (offline sync must be reliable before pilot deployment)
**Requirements**: DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. trestle.sentinelaerial.com loads the pilot portal PWA and is installable on mobile devices
  2. Login at trestle.sentinelaerial.com works correctly with Supabase auth redirect URLs configured for the subdomain
  3. Square production webhook is registered and processes real payments (sandbox data archived, production environment variables set)
**Plans**: 2 plans
Plans:
- [ ] 11-01-PLAN.md -- config.toml fix, Vercel project creation, DNS, and Supabase auth redirects
- [ ] 11-02-PLAN.md -- Square production cutover and end-to-end deployment verification

## Progress

**Execution Order:**
Phases 7 and 10 are independent and can run in parallel. Phase 8 depends on 7. Phase 9 depends on 8. Phase 11 depends on 9 and 10.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 7. Foundation and Quick Wins | 2/2 | Complete   | 2026-03-05 | - |
| 8. Watermark Pipeline | 2/2 | Complete   | 2026-03-05 | - |
| 9. Billing Lifecycle | v2.0 | 0/? | Not started | - |
| 10. Offline Sync Hardening | 3/3 | Complete    | 2026-03-05 | - |
| 11. Standalone Deployment | v2.0 | 0/2 | Planned | - |
