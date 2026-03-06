# Milestones: Faith & Harmony Operations Platform

## v1.0 Landing Page (Complete)

**Shipped:** 2026-02
**Phases:** 1 through 5
**Summary:** Conversion focused landing page at sentinelaerial domain with SEO infrastructure, structured data, sitemap, inline quote form, military airspace differentiator, portfolio grid, FAQ, image optimization, and mobile responsive design.

## v1.1 Voice Bot + Automated Intake Pipeline (Complete)

**Shipped:** 2026-03-05
**Phases:** 1 through 6 (15 plans)
**Last phase number:** 6
**Summary:** Vapi voice bot with ElevenLabs TTS answering 757 number. Qualifies callers, quotes pricing, creates requests automatically via n8n middleware to intake API. Admin scheduling with availability slots and blackout dates. NWS weather integration with 48 hour forecast checks against flight parameters. Admin call log and leads pages. Full pipeline validated with live test calls.

**Key artifacts:**
- leads table, vapi_call_logs table
- intake-lead and pricing-lookup edge functions
- vapi-tool-handler edge function
- Paula bot system prompt and tool schemas
- n8n WF5 Vapi pipeline workflow
- availability_slots and blackout_dates tables
- availability-check edge function
- weather_forecast_cache table
- weather-forecast-fetch edge function
- Admin pages: Scheduling, Weather Operations, Call Logs, Leads

## v2.0 Billing, Equipment, and Production Readiness (Complete)

**Shipped:** 2026-03-06
**Phases:** 7 through 12 (14 plans)
**Last phase number:** 12
**Timeline:** 2 days (2026-03-05 to 2026-03-06)
**Stats:** 31 commits, 109 files modified, 7,509 insertions, 64,215 LOC TypeScript
**Summary:** Full production readiness with automated billing lifecycle (Square deposit/balance/receipt/delivery), equipment accessories management, watermarked preview pipeline, offline sync hardening with dead letter store, standalone Trestle deployment at trestle.sentinelaerialinspections.com, and Mission Control validation.

**Key accomplishments:**
- End-to-end billing flow from balance invoice through Square payment to automatic receipt and deliverable release
- Watermarked preview generation on local rig via n8n pipeline with separate storage buckets
- Dead letter store for failed offline syncs with persistent pilot warning banner
- Standalone Trestle PWA at trestle.sentinelaerialinspections.com with domain-aware routing
- Mission Control admin UI (apps, announcements) with satellite plugin and API key auth
- Integration audit fixing wrong domains, blocked geolocation, missing edge function configs, redirect loops, and stale SEO

**Key artifacts:**
- accessories table with delete_accessory_safe RPC
- watermark-previews public storage bucket
- create-balance-invoice, send-balance-due-email, send-payment-receipt-email edge functions
- square-webhook with payment processing and fire-and-forget downstream triggers
- Dead letter store in IndexedDB with DeadLetterBanner component
- Domain-aware routing in App.tsx (F&H vs Trestle)
- Mission Control satellite plugin (Provider, Widget, hooks, auto-registration)
