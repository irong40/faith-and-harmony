# Project Research Summary

**Project:** Faith & Harmony Operations Platform v2.0
**Domain:** Drone service business operations (billing lifecycle, equipment management, offline ops, production deployment)
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

This is a v2.0 milestone on a mature drone operations platform (React 18 + Vite + Supabase, 53 migrations, 41 edge functions). The core challenge is not greenfield development but closing the quote-to-payment lifecycle gap. The platform can acquire clients, generate quotes, and manage jobs, but cannot yet collect the balance payment, gate deliverable release on payment, or provide the admin with billing visibility. The v2.0 work is roughly 60% billing flow completion, 20% equipment management, and 20% production hardening (PWA icons, offline sync verification, standalone deployment).

The recommended approach is to build the billing pipeline first because it is the revenue-critical path and has the most dependencies. The watermarked preview generation must happen before the balance invoice email can be sent, and the receipt/delivery chain must work before the lifecycle is complete. Most of the infrastructure already exists: the deposit invoice edge function, the Square webhook handler, the payments table with full schema, and the delivery email template. The new work is three edge functions (balance invoice, balance due email, payment receipt), a watermark generation step in the n8n pipeline, and admin UI for billing status. Accessories CRUD, offline sync verification, PWA icons, and Vercel subdomain setup are all independent and can be parallelized or sequenced freely.

The primary risks are: (1) orphaned Square invoices where money is collected but the app has no record, mitigated by reversing the write order to insert the Supabase row before calling the Square API; (2) silent data loss in the offline sync queue after max retries, mitigated by adding a dead letter store in IndexedDB; and (3) watermarked preview URLs that expose full-resolution originals through predictable URL patterns, mitigated by storing originals and previews in separate storage buckets with different access policies. All three risks have clear prevention strategies that should be implemented as part of their respective phases, not deferred.

## Key Findings

### Recommended Stack

The existing stack (React 18, Vite 5, TypeScript, Tailwind, Shadcn/ui, Supabase, TanStack Query, vite-plugin-pwa) requires almost no additions. Total new npm packages: one dev dependency (`@vite-pwa/assets-generator` for icon generation). All new backend work uses Deno edge functions with existing patterns.

**Core additions:**
- **imagemagick_deno@0.0.31**: WASM-based image watermarking in edge functions -- only library that works on Deno Deploy (Sharp and libvips crash)
- **Square API version 2025-10-16**: Upgrade from 2024-01-18 -- same endpoint shape, header-only change, avoids deprecation
- **@vite-pwa/assets-generator**: One-time icon generation from source SVG -- dev dependency only

**Critical constraint:** Supabase edge functions have 512 MB memory and 150-second timeout. DJI aerial photos are 20-40 MP. Watermarking must happen on resize-to-preview images, not full resolution. Better yet, generate watermarks during the n8n pipeline on the local processing rig (RTX 5060 Ti, 32 GB RAM) and store them in Supabase Storage.

### Expected Features

**Must have (table stakes -- blocks revenue collection):**
- Deposit amount fix (verify 50% not 25% in quote creation)
- Balance invoice creation edge function
- Watermarked preview generation in processing pipeline
- Balance due email with previews and Square payment link
- Receipt email after balance paid, gated deliverable release
- Admin payments panel (deposit/balance status per job)
- Accessories CRUD admin page
- Production PWA icons
- Vercel subdomain for trestle.sentinelaerial.com

**Should have (differentiators):**
- Automated end-to-end billing lifecycle (one-click per stage, zero manual emails)
- Payment-gated deliverable release (full res only after balance clears)
- Equipment compatibility tracking (accessories linked to compatible aircraft)

**Defer (v2.x/v3+):**
- Overdue payment reminder emails
- Payment history/ledger view
- Sync status indicator with last-synced timestamp
- Customer portal payment awareness
- Client-facing payment history page

### Architecture Approach

The platform follows a Supabase edge function chain pattern where multi-step workflows (create invoice, send email, update status) are decomposed into independently testable and retryable functions that call each other via HTTP. The billing data flow is linear: quote accepted -> deposit invoice -> deposit paid webhook -> mission flown/processed -> watermarked previews stored -> balance invoice -> balance paid webhook -> receipt + full delivery. The offline sync uses an application-layer IndexedDB queue with try-online-then-queue writes and 30-second auto-sync with online event detection.

**Major components to build:**
1. **create-balance-invoice** -- mirrors deposit pattern, calculates remaining balance, sets Net 15 due date
2. **send-balance-due-email** -- branded Resend email with inline watermarked thumbnails and Square payment link
3. **send-payment-receipt** -- triggered by square-webhook on balance payment, sends receipt and invokes drone-delivery-email for full res
4. **Admin payments panel** -- React Query-powered billing dashboard showing deposit/balance status per job
5. **Accessories admin page** -- route and nav wiring to existing FleetOverview with AccessoryFormDialog

### Critical Pitfalls

1. **Orphaned Square invoices** -- if the Supabase payments row insert fails after Square invoice creation, money is collected with no tracking. Fix: insert Supabase row FIRST, then call Square API. Add a daily reconciliation function.
2. **Silent sync data loss** -- after 5 failed retries, sync items are deleted with only a console.error. Fix: add a dead letter IndexedDB store, show persistent UI warning, make items retryable from admin.
3. **Balance email before deliverables ready** -- if triggered on job status change alone, email fires with broken image links. Fix: gate on both status AND verified storage files. Make it a manual admin action.
4. **Preview URLs expose originals** -- predictable URL patterns let clients guess full-resolution paths. Fix: separate storage buckets with different access policies for originals vs previews.
5. **Square sandbox-to-production cutover** -- sandbox IDs in the payments table break production webhook matching. Fix: archive sandbox data, update all env vars, register production webhook, test end-to-end before go-live.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Quick Wins
**Rationale:** Zero-dependency items that can ship immediately, build confidence, and unblock parallel work.
**Delivers:** Production PWA icons, accessories admin page routing, deposit amount verification/fix.
**Addresses:** PWA icons (P1), accessories CRUD (P1), deposit fix (P1).
**Avoids:** PWA icon cache staleness (keep same filenames); accessories orphaned IDs (add deletion guard).

### Phase 2: Watermark Pipeline
**Rationale:** Watermarked previews are a hard dependency for the balance due email. Must exist before any billing work beyond the deposit flow.
**Delivers:** n8n pipeline step that generates watermarked preview thumbnails, stores them in a separate `watermarked/` storage prefix with appropriate access policies.
**Uses:** imagemagick (local rig processing) or imagemagick_deno (edge function for smaller images).
**Avoids:** Watermarking at delivery time (edge function memory limits); preview URLs exposing originals (separate buckets).

### Phase 3: Billing Lifecycle
**Rationale:** Revenue-critical path. Depends on watermarked previews from Phase 2. This is the highest-value work in the milestone.
**Delivers:** create-balance-invoice edge function, send-balance-due-email edge function, send-payment-receipt edge function, square-webhook balance payment handling, admin payments panel UI.
**Addresses:** Balance invoice (P1), balance due email (P1), receipt email (P1), payment-gated delivery (P1), admin payments panel (P1).
**Avoids:** Orphaned invoices (reverse write order); balance email before deliverables ready (gate check); sandbox/production mixup (cutover checklist).

### Phase 4: Offline Sync Hardening
**Rationale:** Independent of billing. The sync engine works but has a silent data loss bug and no user feedback. Can be done in parallel with Phase 3 or after.
**Delivers:** Dead letter store in IndexedDB, robust try/catch fallback pattern, sync status UI feedback, end-to-end verification of flight log offline path.
**Addresses:** Offline flight log verification (P2), sync status indicator (P2).
**Avoids:** Silent data loss after max retries; IndexedDB schema upgrade breakage (test v1-to-v2 upgrade path).

### Phase 5: Standalone Deployment and Go-Live
**Rationale:** Deploy only after all features are verified on the primary deployment. Custom domain must be configured BEFORE any pilot installs the PWA.
**Delivers:** Second Vercel project at trestle.sentinelaerial.com, Supabase auth redirect URL updates, Square production cutover, go-live verification.
**Avoids:** Auth session confusion across domains (independent login at subdomain); sandbox data in production (cutover checklist).

### Phase Ordering Rationale

- Phases 1 and 4 have zero dependencies and can run in parallel with anything
- Phase 2 must complete before Phase 3 because the balance email needs watermarked preview URLs
- Phase 3 is the critical path and highest business value -- it should get the most attention
- Phase 5 is last because deploying before features are verified creates a moving target for pilots
- The billing flow within Phase 3 is itself sequential: balance invoice -> balance email -> webhook wiring -> receipt email

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Watermark Pipeline):** The n8n pipeline modification needs investigation -- how does the current processing workflow trigger, where does it store files, what format/naming convention. The choice between local-rig watermarking (preferred) and edge-function watermarking affects architecture.
- **Phase 3 (Billing Lifecycle):** The exact quote-to-job data relationships need mapping during implementation. The deposit amount source (quote.deposit_amount) and how it is set during quote creation needs verification.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Icon replacement, route wiring, and a simple data fix. Well-understood.
- **Phase 4 (Offline Sync):** IndexedDB dead letter pattern is straightforward. The existing sync engine code is the primary reference.
- **Phase 5 (Deployment):** Vercel custom domain and DNS are well-documented. The Supabase auth redirect URL update is a dashboard toggle.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing codebase is the primary source. Only one new Deno library (imagemagick_deno). All patterns proven in production edge functions. |
| Features | HIGH | Feature list derived directly from PROJECT.md and codebase analysis. Dependency chain verified against existing code. Clear P1/P2/P3 prioritization. |
| Architecture | HIGH | All architectural patterns extend existing code. Edge function chain, offline sync, and SPA deployment are established in the codebase. No novel architecture required. |
| Pitfalls | HIGH | Square billing pitfalls verified against official API docs. Offline sync pitfalls verified against actual sync-engine.ts code. Storage security pitfalls are standard Supabase patterns. |

**Overall confidence:** HIGH

### Gaps to Address

- **n8n pipeline watermark step:** Research did not examine the current n8n workflow structure. During Phase 2 planning, inspect the n8n backup workflows to understand where watermark generation fits in the processing chain.
- **Deposit amount verification:** The deposit invoice description says 25% but PROJECT.md says 50%. The actual amount comes from `quote.deposit_amount`. Need to verify what value quote creation sets. This is a quick codebase check, not a research gap.
- **Accessory deletion with orphaned references:** `accessory_ids` in `mission_equipment` is a UUID array with no foreign key constraint. Deletion behavior needs a design decision: block deletion of referenced accessories, or clean up arrays. Decide during Phase 1 planning.
- **imagemagick_deno version stability:** Version 0.0.31 is the latest but the 0.0.x version number suggests pre-1.0 instability. Verify at build time that the API has not changed. Consider pinning the import URL (already recommended in STACK.md).

## Sources

### Primary (HIGH confidence)
- Existing codebase at `D:\Projects\FaithandHarmony\` -- edge functions, sync engine, types, migrations, configs
- Square Invoices API Reference (version 2025-10-16) -- endpoint structure, payment_requests, idempotency
- Supabase Edge Function documentation -- WASM-only constraint, memory limits, image manipulation guide
- Supabase Storage access control documentation -- bucket policies, signed URLs

### Secondary (MEDIUM confidence)
- imagemagick_deno@0.0.31 on deno.land -- version confirmed, pre-1.0 stability caveat
- PWA icon caching behavior (web.dev) -- Android 24-72h refresh, iOS requires reinstall
- Workbox precaching size limits -- Chrome DevTools documentation

### Tertiary (LOW confidence)
- n8n pipeline structure -- not directly inspected during research, inferred from codebase references and backup workflow files

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
