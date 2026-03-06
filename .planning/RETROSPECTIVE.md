# Retrospective: Faith & Harmony Operations Platform

## Milestone: v2.0 Billing, Equipment, and Production Readiness

**Shipped:** 2026-03-06
**Phases:** 6 | **Plans:** 14

### What Was Built
- Accessories CRUD with deletion guard and aircraft compatibility filtering
- Watermark tile generation (canvas) and n8n pipeline watermark step (ImageMagick)
- Full billing lifecycle: balance invoice, Square webhook, receipt email, delivery release
- Dead letter store for offline sync failures with persistent pilot warning banner
- Standalone Trestle PWA at trestle.sentinelaerialinspections.com with domain-aware routing
- Mission Control admin UI validation (apps, announcements, satellite plugin)
- Integration audit fixing 9 cross-cutting issues (wrong domains, blocked geolocation, missing configs, redirect loops, stale SEO)

### What Worked
- Atomic plan execution with summaries kept progress trackable
- Phase dependency ordering (7 and 10 parallel, 8 after 7, 9 after 8, 11 after 9+10) avoided blocking
- Fire and forget pattern for downstream triggers prevented webhook retry storms
- Always queue to IndexedDB first eliminated complex online/offline branching
- Row-before-API-call pattern for Square prevented orphaned invoices

### What Was Inefficient
- Phase 11 and 12 were completed but summaries never written, causing GSD to think they were unexecuted
- REQUIREMENTS.md had 4 unchecked boxes for completed work (tracking fell behind execution)
- Integration audit found issues that should have been caught earlier (wrong domain in edge functions shipped across multiple phases)
- Phase 12 validation was done outside GSD workflow (no formal plan created)

### Patterns Established
- Domain-aware routing pattern: `isTrestleDomain()` check in App.tsx for multi-domain SPA
- Branded email template with BRAND constant object (purple, gold, cream, companyName, tagline, email, website)
- Edge function inter-calling via fetch with service role key as Bearer token
- Watermark pipeline: generate tile locally, deploy to /opt/sentinel/assets/, n8n composite step

### Key Lessons
- Always write summaries immediately after completing work, not retroactively
- Run integration audits after multi-phase work that touches shared config (domains, edge functions, headers)
- Manual dashboard tasks (Vercel, DNS, Supabase settings) need explicit tracking outside GSD plans

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 | v2.0 |
|--------|------|------|------|
| Phases | 5 | 6 | 6 |
| Plans | 8 | 15 | 14 |
| Timeline | ~2 weeks | ~3 days | ~2 days |

**Observations:**
- Execution speed increasing as patterns stabilize and codebase conventions are well established
- Edge function count growing (50+). May need organizational cleanup in future milestone.
- Integration testing becoming more important as cross-cutting concerns multiply
