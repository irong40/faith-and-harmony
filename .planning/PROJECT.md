# Faith & Harmony Operations Platform

## What This Is

The operations platform for Sentinel Aerial Inspections (Faith & Harmony LLC), a veteran owned drone services company in Hampton Roads, Virginia. The platform handles client acquisition through a public landing page and automated phone intake, job management through admin and pilot portals, automated billing through Square integration with watermarked preview delivery, and offline field operations through the Trestle PWA. Built on React 18 + Vite + TypeScript + Supabase with 56+ migrations and 50+ edge functions, deployed to Vercel across two domains.

## Core Value

A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.

## Current State

**v2.0 shipped 2026-03-06.** Platform is production ready.

**Live domains:**
- faithandharmonyllc.com (landing page + admin portal)
- trestle.sentinelaerialinspections.com (pilot PWA)
- sentinelaerialinspections.com (marketing site, separate repo)

**Codebase:** 64,215 LOC TypeScript across 109+ source files, 56+ Supabase migrations, 50+ edge functions.

## Requirements

### Validated

- v1.0: Landing page with SEO, structured data, inline quote form, military airspace differentiator, portfolio grid
- v1.0: Image optimization, mobile responsive, security headers, Vercel deployment
- v1.1: Vapi voice bot with ElevenLabs TTS on 757 number
- v1.1: n8n middleware for automated intake pipeline
- v1.1: Admin scheduling with availability slots and blackout dates
- v1.1: NWS weather integration with flight parameter checks
- v1.1: Admin call log and leads pages
- v2.0: Accessories CRUD with deletion guard and aircraft compatibility
- v2.0: Watermarked preview pipeline on local rig via n8n
- v2.0: Full billing lifecycle (deposit, balance invoice, payment webhook, receipt, delivery release)
- v2.0: Offline sync hardening with dead letter store and pilot warnings
- v2.0: Standalone Trestle deployment with domain-aware routing
- v2.0: Mission Control validation (admin UI, satellite plugin, edge function)
- v2.0: Production PWA icons with Sentinel branding

### Active

(None. Ready for next milestone planning.)

### Out of Scope

- Client login portal (clients interact via email only)
- Landing page redesign (v1.0 complete)
- Voice bot changes (v1.1 complete)
- Multi pilot support (single pilot operation)
- Mobile native app (PWA covers mobile needs)
- Real-time availability display on landing page (future milestone)
- Configurable deposit percentage (fixed 50%)
- On-demand watermark generation (pipeline only)

## Context

### Architecture

Single React SPA deployed to Vercel with domain-aware routing. faithandharmonyllc.com shows landing page for guests and admin portal for authenticated admins. trestle.sentinelaerialinspections.com redirects to auth and shows pilot portal.

Supabase (project qjpujskwqaehxnqypxzu) provides auth, Postgres, storage, and edge functions. Shared across F&H products.

n8n (cloud hosted) handles processing pipeline, Vapi webhook relay, and email automation. Reaches local processing rig through Cloudflare Tunnel.

Square handles payments (deposit and balance invoices). Resend handles email delivery.

### Equipment Fleet

Aircraft: DJI Matrice 4E (primary), Mavic 3 Enterprise (secondary), Mini 4 Pro (current ops). Supporting equipment tracked in accessories table with aircraft compatibility.

### Billing Flow

Client accepts proposal. 50% deposit via Square. Mission scheduled and completed. Balance due email with watermarked previews and payment link. Client pays. Full resolution deliverables released. Receipt sent via Resend.

### Infrastructure

- 50+ edge functions following Deno + CORS + serve() pattern
- 56+ Supabase migrations
- n8n self-hosted with Cloudflare tunnel
- Square connected for payments
- Resend connected for email
- Always use --use-api flag for supabase functions deploy on this machine

## Constraints

- **Tech stack**: React 18 + Vite + TypeScript. No framework migration.
- **Shared codebase**: All features live in same repo.
- **Supabase project**: Shared across F&H products (qjpujskwqaehxnqypxzu).
- **Square**: Deposit and balance payment via Square API.
- **Resend**: Automated receipts, previews, and delivery notifications.
- **Deposit**: Fixed 50% of package price.
- **Writing constraints**: No dashes, semicolons, emojis, asterisks, colons in prose, cliches, marketing language, AI filler. Active voice. Direct address.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep custom CSS for landing page | 813 lines of themed CSS, extend not rewrite | Good |
| react-helmet-async for meta tags | Per route meta without SSR | Good |
| Inline quote form | Captures leads on page, no leakage | Good |
| Vapi over custom Twilio | Higher level abstraction, ElevenLabs native | Good |
| n8n as middleware | Decouples bot from app, easier to debug | Good |
| Weather API for flight availability | Automates biggest operational variable | Good |
| Fixed 50% deposit | Simple, predictable | Good |
| Watermarked previews with balance due | Builds confidence, protects deliverables | Good |
| Canvas npm for watermark tile | Avoids edge function 512MB limit | Good |
| ImageMagick via n8n for resize | Local rig handles heavy processing | Good |
| Row before Square API call | Prevents orphaned invoices | Good |
| Dead letter store over silent deletion | Failed syncs visible, debuggable | Good |
| Always queue to IndexedDB first | Removes online/offline branching | Good |
| Fire and forget for downstream triggers | Prevents webhook retry storms | Good |
| Domain-aware routing in App.tsx | Single codebase serves both domains | Good |

---
*Last updated: 2026-03-06 after v2.0 milestone*
