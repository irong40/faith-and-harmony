# Faith & Harmony Operations Platform

## What This Is

The operations platform for Sentinel Aerial Inspections (Faith & Harmony LLC), a veteran owned drone services company in Hampton Roads, Virginia. The platform handles client acquisition through a public landing page and automated phone intake, job management through admin and pilot portals, and payment processing through Square integration. Built on React 18 + Vite + TypeScript + Supabase with 53 migrations and 41 edge functions, deployed to Vercel.

## Core Value

A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.

## Current Milestone: v2.0 Billing, Equipment, and Production Readiness

**Goal:** Close all remaining gaps to make the platform production ready with automated billing, complete equipment tracking, reliable offline operations, and standalone Trestle deployment.

**Target features:**
- Billing/payment flow (Square 50% deposit, watermarked previews with balance due, auto receipts via Resend)
- Accessories management UI (all gear: props, RTK, chargers, tablets, SD cards)
- Full end to end offline flight log queueing integration
- Production PWA icons (replace SVG placeholders)
- Standalone Vercel deployment at trestle.sentinelaerial.com

## Requirements

### Validated

- ✓ React 18 + Vite + TypeScript + Tailwind + Shadcn/ui + Supabase app — v1.0
- ✓ Landing page at "/" with SEO infrastructure, structured data, sitemap — v1.0
- ✓ Conversion focused page with inline quote form and pricing — v1.0
- ✓ Military airspace differentiator, trust bar, portfolio grid, FAQ — v1.0
- ✓ Image optimization (logo 33KB, WebP variants, lazy loading) — v1.0
- ✓ Mobile responsive (tablet + small mobile breakpoints) — v1.0
- ✓ Performance (font optimization, reduced animations, security headers) — v1.0
- ✓ Admin portal at "/admin/*" (20+ pages) — pre-existing
- ✓ Pilot portal at "/pilot/*" — pre-existing
- ✓ PWA configured with vite-plugin-pwa — pre-existing
- ✓ Deployed to Vercel with SPA rewrites — pre-existing

### Active

- [ ] Billing/payment flow with Square integration (50% deposit, balance after delivery)
- [ ] Watermarked preview delivery with balance due email
- [ ] Automatic receipt and full resolution delivery after final payment
- [ ] Accessories management UI for all equipment types
- [ ] End to end offline flight log queueing with sync
- [ ] Production PWA icons
- [ ] Standalone Vercel deployment at trestle.sentinelaerial.com
- [ ] Mission Control validation (edge function deployed, admin UI tested, satellite plugin documented)

### Out of Scope

- Client portal — clients interact via email only, no login
- Landing page redesign — v1.0 complete
- Voice bot changes — v1.1 complete
- Multi pilot support — single pilot operation
- Mobile native app — PWA covers mobile needs
- Real-time availability display on landing page — future milestone

## Context

### Billing Flow (v2.0)

Client accepts proposal. Payment request sent for 50% deposit with option to pay in full. Deposit triggers pilot workflow (mission can be scheduled). Mission complete, processing done. Balance due email sent with 2 to 3 watermarked preview thumbnails and Square payment link. Client pays balance. Full resolution deliverables released automatically. Final receipt sent via Resend. No client portal. All communication via automated email.

### Existing Invoice Flow (v1.0/v1.1)

A request is submitted. From the request, an invoice is created and sent to the customer. The customer accepts it, then payment is requested to continue. Deposit is made, receipt for deposit is issued, work is completed, email invoice is sent due upon receipt. Deliverables are not released until final payment.

### Equipment Fleet

Aircraft: DJI Matrice 4E (primary), Mavic 3 Enterprise (secondary), Mini 4 Pro (current ops). Supporting equipment includes Emlid Reach RS3 RTK, TB65 batteries, DJI RC Plus 2 controller, props, cases, filters, chargers, tablets, SD cards. Accessories table exists in schema but has no frontend UI.

### Service Packages (from CLAUDE.md)

Residential: Listing Lite $225, Listing Pro $450, Luxury Listing $750
Commercial: Construction Progress $450/visit, Commercial Marketing $850, Inspection Data $1,200
Add ons: Rush Premium (+25%/+50%), Raw File Buyout (+$250), Brokerage Retainer $1,500/month

### Offline Architecture

IndexedDB sync queue with sync_queue, missions_cache, fleet_cache stores. Sync engine with auto retry, conflict detection, background sync. Flight log queueing exists partially but needs full end to end integration with the sync engine.

## Constraints

- **Tech stack**: React 18 + Vite + TypeScript. No framework migration.
- **Shared codebase**: All features live in same repo. API endpoints follow existing edge function patterns.
- **Supabase project**: Shared across F&H products (qjpujskwqaehxnqypxzu). Accessories table exists, billing tables needed.
- **Square**: Already connected for payment processing. Deposit and balance payment via Square API.
- **Resend**: Already connected for email delivery. Automated receipts, previews, and delivery notifications.
- **Deposit**: Fixed 50% of package price. No configurable amounts.
- **Delivery gate**: Watermarked previews with balance due, full resolution after payment clears.
- **Domain**: trestle.sentinelaerial.com for pilot PWA deployment.
- **Writing constraints**: No dashes, semicolons, emojis, asterisks, colons in prose, cliches, marketing language, AI filler. Active voice. Direct address.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep custom CSS over Tailwind for landing page | 813 lines of themed CSS. Extending not rewriting. | ✓ Good |
| Add react-helmet-async for meta tags | Per route meta management without SSR. | ✓ Good |
| Inline quote form instead of external booking link | Captures leads on page, no leakage to droneinvoice.com | ✓ Good |
| Skip SSR, prerendering deferred | Full SSR migration is out of scope for v1.0 | ✓ Good |
| Vapi over custom Twilio build | Higher level abstraction, faster to production, ElevenLabs native support | Good |
| n8n as middleware between Vapi and F&H app | Decouples bot from app, easier to debug and modify, already running | Good |
| Weather API for flight availability | Automates the biggest operational variable for drone work | Good |
| Fixed 50% deposit | Simple, predictable for clients and business | Pending |
| Watermarked previews with balance due | Builds client confidence, protects deliverables before payment | Pending |
| trestle.sentinelaerial.com | Brand aligned subdomain for pilot PWA | Pending |

---
*Last updated: 2026-03-05 after v2.0 milestone start*
