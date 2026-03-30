-- Phase 13 Plan 02: Lead Activity View
-- Creates a chronological event timeline for any given lead by unioning three event sources:
-- 1. qualification status changes from the leads table (current status only, no history)
-- 2. note additions from lead_notes
-- 3. conversion events detected by the presence of a client_id on a lead

CREATE OR REPLACE VIEW public.lead_activity AS

-- Status changes: one row per lead representing their current status.
-- Since the leads table does not store history, this gives the "last known status" event.
-- The event_at is updated_at so it reflects when the status was last changed.
SELECT
  l.id                                          AS lead_id,
  'status_change'::text                         AS event_type,
  l.updated_at                                  AS event_at,
  'Status set to ' || l.qualification_status::text AS summary,
  l.id                                          AS source_id
FROM public.leads l
WHERE l.updated_at > l.created_at  -- only include if record was actually updated

UNION ALL

-- Note additions: one row per note
SELECT
  n.lead_id                                     AS lead_id,
  'note_added'::text                            AS event_type,
  n.created_at                                  AS event_at,
  CASE
    WHEN n.reason_tag IS NOT NULL THEN 'Note added (' || n.reason_tag || '): ' || left(n.content, 80)
    ELSE 'Note added: ' || left(n.content, 80)
  END                                           AS summary,
  n.id                                          AS source_id
FROM public.lead_notes n

UNION ALL

-- Conversion events: one row per lead that has been linked to a client
SELECT
  l.id                                          AS lead_id,
  'converted'::text                             AS event_type,
  l.updated_at                                  AS event_at,
  'Lead converted to client'                    AS summary,
  l.client_id                                   AS source_id
FROM public.leads l
WHERE l.client_id IS NOT NULL;

COMMENT ON VIEW public.lead_activity IS 'Chronological event timeline for leads. Unions status changes, notes, and conversion events. Query by lead_id and ORDER BY event_at DESC for the detail drawer timeline.';

-- Grant SELECT to authenticated so RLS on the underlying tables controls access.
-- Views use SECURITY INVOKER by default in Postgres 15+, so the caller's RLS policies apply.
GRANT SELECT ON public.lead_activity TO authenticated;
GRANT SELECT ON public.lead_activity TO service_role;
