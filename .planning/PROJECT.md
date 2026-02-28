# Faith & Harmony Operations Platform

## What This Is

The operations platform for Sentinel Aerial Inspections (Faith & Harmony LLC), a veteran owned drone services company in Hampton Roads, Virginia. The platform handles client acquisition through a public landing page and automated phone intake, job management through admin and pilot portals, and payment processing through Square integration. Built on React 18 + Vite + TypeScript + Supabase with 53 migrations and 41 edge functions, deployed to Vercel.

## Core Value

A prospective client can find Sentinel through search or phone, get qualified, receive a quote, and book a drone job without Iron personally fielding the call or manually creating the request.

## Current Milestone: v1.1 Voice Bot + Automated Intake Pipeline

**Goal:** Replace manual phone intake with a Vapi voice bot that qualifies callers, captures job details, creates requests in the F&H app via API, and triggers the existing invoice workflow. Add scheduling and weather-aware flight availability.

**Target features:**
- Vapi voice bot with ElevenLabs TTS and 757 area code number
- Intake API endpoint on F&H app for structured call data
- n8n middleware workflow (Vapi webhook to F&H API)
- Scheduling and availability management
- Weather-aware flight operations (forecast checks against flight parameters)
- End-to-end automated flow: phone call to request to invoice to payment

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

- [ ] Vapi voice bot with ElevenLabs integration and 757 phone number
- [ ] System prompt trained on Faith & Harmony packages, service area, and FAQs
- [ ] Intake API endpoint receiving structured call data and creating requests
- [ ] n8n workflow connecting Vapi webhook to F&H app API
- [ ] Scheduling and availability management in the app
- [ ] Weather API integration for flight parameter checking
- [ ] Automated request-to-invoice flow triggered by bot intake
- [ ] Edge case routing (out of service area, complex jobs, payment questions)

### Out of Scope

- Admin portal changes (existing, untouched) — stable
- Pilot portal changes (existing, untouched) — stable
- Landing page redesign — v1.0 complete, no changes needed
- Custom voice cloning — use existing ElevenLabs voices
- Multi-language support — English only for Hampton Roads market
- Outbound calling — inbound intake only for v1.1
- SMS/chat bot — phone voice only for v1.1
- Real-time availability display on landing page — future milestone

## Context

### Existing Invoice Flow

A request is submitted. From the request, an invoice is created and sent to the customer. The customer accepts it, then payment is requested to continue. Deposit is made, receipt for deposit is issued, work is completed, email invoice is sent due upon receipt. Deliverables are not released until final payment.

### Voice Bot Architecture

Vapi handles telephony, STT, conversation orchestration, and routes to ElevenLabs for TTS. Mid-conversation tool calls can query the F&H API for pricing and availability. On call completion, Vapi fires a webhook to n8n, which transforms the data and calls the F&H intake endpoint. The intake endpoint creates the client record and request, which feeds into the existing invoice workflow.

### Weather Operations

Drone flights are weather dependent. Key parameters: wind speed (sustained and gusts), precipitation probability, visibility, and cloud ceiling. The system checks forecasts 48 hours before scheduled jobs and flags conditions that fall outside safe flight parameters. Weather data available from OpenWeatherMap, Tomorrow.io, or NWS API (free).

### Service Packages (from CLAUDE.md)

Residential: Listing Lite $225, Listing Pro $450, Luxury Listing $750
Commercial: Construction Progress $450/visit, Commercial Marketing $850, Inspection Data $1,200
Add ons: Rush Premium (+25%/+50%), Raw File Buyout (+$250), Brokerage Retainer $1,500/month

### Service Area

Hampton Roads, Virginia: Norfolk, Virginia Beach, Chesapeake, Newport News, Hampton, Suffolk, Portsmouth, Williamsburg. Military airspace operations near NAS Oceana, Norfolk Naval Station, Langley AFB with LAANC authorization.

## Constraints

- **Tech stack**: React 18 + Vite + TypeScript. No framework migration.
- **Shared codebase**: Voice bot integration lives in same repo. API endpoints follow existing patterns.
- **Supabase project**: Shared across F&H products (qjpujskwqaehxnqypxzu). New tables allowed for leads, scheduling, weather.
- **n8n**: Self-hosted on Docker/WSL2, already running for FHContent workflows. Vapi webhook is a new workflow.
- **Vapi**: Cloud service, no self-hosting. API key and webhook configuration only.
- **ElevenLabs**: Existing account. API key needed in Vapi dashboard.
- **Square**: Already connected for payment processing. Invoice creation via API.
- **Writing constraints**: No dashes, semicolons, emojis, asterisks, colons in prose, cliches, marketing language, AI filler. Active voice. Direct address.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep custom CSS over Tailwind for landing page | 813 lines of themed CSS. Extending not rewriting. | ✓ Good |
| Add react-helmet-async for meta tags | Per route meta management without SSR. | ✓ Good |
| Inline quote form instead of external booking link | Captures leads on page, no leakage to droneinvoice.com | ✓ Good |
| Skip SSR, prerendering deferred | Full SSR migration is out of scope for v1.0 | ✓ Good |
| Vapi over custom Twilio build | Higher level abstraction, faster to production, ElevenLabs native support | -- Pending |
| n8n as middleware between Vapi and F&H app | Decouples bot from app, easier to debug and modify, already running | -- Pending |
| Weather API for flight availability | Automates the biggest operational variable for drone work | -- Pending |

---
*Last updated: 2026-02-28 after v1.1 milestone start*
