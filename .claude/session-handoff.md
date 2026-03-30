# Session Handoff
**Date:** 2026-03-06
**Branch:** main

## Accomplished
- Full pipeline integration audit (frontend + backend + edge functions + schema)
- Fixed template lookup for standalone paths C, D, V, B+C (was querying by package_id only — those paths have null package_id)
- Regenerated Supabase types — `processing_jobs` and `step_definitions` now properly typed
- Added `useProcessingTemplateById()` hook for direct template ID lookup
- Added 14 unit tests in `usePipeline.spec.ts` (template resolution, coalesce, conflict detection)
- Removed dead `useDeliveryLogs` hook (delivery_log table superseded by drone_jobs columns)
- Added n8n heartbeat pre-flight check before pipeline trigger (warns admin if offline)
- Documented 3 pending cleanup decisions as ADR in Obsidian vault

## Next Steps
- **Decision required:** Review `obsidian-dev/decisions/ADR - Pipeline Cleanup Decisions.md`
  1. Drop `processing_steps` table? (check n8n workflows first)
  2. Consolidate delivery tracking (delivery_log vs drone_jobs)
  3. n8n webhook URLs — required vs optional in edge functions
- After decisions: run `/qcode` to implement chosen options
- Consider adding integration tests for the full pipeline trigger → n8n → step progression flow
- **Carried over from prior session:**
  - Square production cutover (11-02-PLAN.md)
  - Fix faithandharmonyllc.com deep link 404s (Cloudflare proxy)
  - Phase 8 Watermark Pipeline / Phase 9 Billing Lifecycle

## Known Issues
- `.planning/` files have uncommitted changes (GSD milestone tracking, not app code)
- `supabase/.temp/` permission denied warnings (stale temp dirs from edge function builds)

## Key Decisions
- Template lookup now uses direct ID first, package-based fallback second (covers all 6 processing paths)
- `useDeliveryLogs` removed — delivery tracking lives on `drone_jobs` columns, not `delivery_log` table
- n8n offline warning is a non-blocking toast (job still created), not a hard fail

## Uncommitted Changes
- `.planning/` files only (MILESTONES.md, PROJECT.md, ROADMAP.md, STATE.md, RETROSPECTIVE.md, TODOS.md) — GSD tracking metadata, not application code
