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

## v2.0 Billing, Equipment, and Production Readiness (Active)

**Started:** 2026-03-05
**Phases:** 7 through 12
**Summary:** Close all remaining gaps for production readiness with automated billing, equipment tracking, offline operations, standalone Trestle deployment, and Mission Control validation.

**Phases:**
- Phase 07: Foundation and Quick Wins
- Phase 08: Watermark Pipeline
- Phase 09: Billing Lifecycle
- Phase 10: Offline Sync Hardening
- Phase 11: Standalone Deployment
- Phase 12: Mission Control Validation

**Mission Control pre-existing artifacts (needs validation):**
- apps table with API key auth (SHA-256 hashed)
- maintenance_announcements table with RLS
- app_health_history table
- app_status_overview and active_announcements views
- mission-control-api edge function (heartbeat, tickets, announcements, bootstrap registration)
- Admin pages: Apps, Announcements
- Satellite plugin (src/lib/mission-control-plugin) with Provider, Widget, hooks
- useMissionControlAdmin hook with full CRUD and audit logging
- register_app_with_bootstrap, validate_api_key, generate/revoke_app_api_key RPCs
