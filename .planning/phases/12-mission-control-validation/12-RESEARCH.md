# Phase 12: Mission Control Validation

## What Exists

Mission Control was built as infrastructure alongside the admin dashboard but never formally planned or validated. All code is in place. This phase validates, tests, and closes any gaps.

### Database (3 migrations applied)
- 20260102160554 -- apps table extensions (api_key_hash, heartbeat tracking, owner info), maintenance_announcements table, app_health_history table, API key RPCs, helper views, maintenance_tickets extensions
- 20260102160613 -- view fix (security_invoker = on)
- 20260305400000 -- bootstrap self-registration RPC

### Tables
- apps -- extended with api_key_hash, api_key_prefix, api_key_created_at, health_check_url, heartbeat_interval_seconds, last_heartbeat_at, consecutive_failures, alert_on_failure, owner_email, owner_name
- maintenance_announcements -- title, message, type (info/warning/maintenance/outage/resolved), target_all_apps, target_app_ids, starts_at, ends_at, is_active, priority, created_by. RLS: admins only for write, authenticated for read
- app_health_history -- app_id, status, source (heartbeat/poll/manual), response_time_ms, version, metrics (JSONB), checked_at
- maintenance_tickets -- extended with submitted_via, external_reference, browser_info, page_url

### Views
- app_status_overview -- apps with heartbeat_status (never/recent/stale/offline) and open_ticket_count
- active_announcements -- active announcements with display_status

### RPCs
- validate_api_key(p_api_key) -- SHA-256 hash lookup, returns app info + is_valid
- generate_app_api_key(p_app_id) -- admin only, returns plain key (mc_ prefix + 16 random bytes hex)
- revoke_app_api_key(p_app_id) -- admin only, nulls hash/prefix/created_at
- record_app_heartbeat(p_app_id, p_status, p_version, p_metrics, p_response_time_ms) -- updates apps + inserts health history
- get_app_announcements(p_app_id) -- returns active announcements for app (respects target_app_ids)
- register_app_with_bootstrap(p_name, p_code, ...) -- self-registration with bootstrap secret, returns app_id + api_key

### Edge Function
- mission-control-api/index.ts -- Deno edge function with 5 endpoints:
  - POST /register (bootstrap secret auth)
  - POST /heartbeat (API key auth)
  - POST /tickets (API key auth)
  - GET /tickets (API key auth, paginated)
  - GET /announcements (API key auth)

### Admin UI
- src/pages/admin/Apps.tsx -- register apps, generate/revoke API keys, view heartbeat status, open ticket counts
- src/pages/admin/Announcements.tsx -- CRUD announcements with type, scheduling, targeting, priority
- src/hooks/useMissionControlAdmin.ts -- React Query hooks for all operations + audit logging

### Satellite Plugin
- src/lib/mission-control-plugin/ -- drop-in package for other apps
  - MissionControlProvider -- context provider with heartbeat loop
  - MissionControlWidget -- floating UI (ticket submission, ticket list, announcements)
  - useMissionControl hook
  - AnnouncementBanner component
  - TicketList and TicketSubmissionForm components
  - Config at config/mission-control.config.ts

### Config Issue
The satellite plugin config points to Supabase project cwaxhfmstlkxqpuhbrbv but the main F&H project is qjpujskwqaehxnqypxzu. Needs investigation -- either the edge function was deployed to the wrong project or the config is stale.

## Gaps to Validate

1. Edge function deployment -- Is mission-control-api deployed? To which Supabase project?
2. Config mismatch -- Plugin hubUrl points to cwaxhfmstlkxqpuhbrbv, not the main F&H project
3. MC_BOOTSTRAP_SECRET -- Is this env var set on the edge function?
4. End to end test -- Register an app via bootstrap, send heartbeat, create ticket, fetch announcements
5. Admin routing -- Verify /admin/apps and /admin/announcements are in the router
6. Dashboard integration -- Does the admin dashboard show Mission Control status anywhere?
7. Ticket admin view -- No admin page for viewing/triaging tickets submitted via the API (Apps page shows count but no detail view)
8. Announcement targeting -- UI has Target All Apps toggle but no way to select specific apps when off
9. Plugin README accuracy -- Verify instructions match current implementation
10. RLS on app_health_history -- INSERT policy is WITH CHECK true with no TO clause. Should this be restricted?

## Scope

This phase is validation, not new feature work. Fix config issues, verify deployment, run end to end test, document gaps for future work. Do not build new admin pages or features unless a gap blocks core functionality.
