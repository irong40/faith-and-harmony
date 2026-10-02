-- Applied live via MCP 2026-10-02 as version 20261002124510; this file is the
-- repo mirror (version matches live history so db push never re-applies it).
--
-- Adam 2026-10-02: the job list is mostly test missions. Archive them and start
-- fresh, keeping the paid work. Archive, never delete: 22 tables hang off drone_jobs.
--
-- 1. An archive marker. NULL = live. A timestamp = archived, hidden from the
--    mission list, Mission Control, Trestle and the CRM state snapshot.
alter table public.drone_jobs
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text;

comment on column public.drone_jobs.archived_at is
  'NULL = live. Set = archived: hidden from lists, dashboards and crm_state_snapshot. Nothing is deleted; set back to NULL to restore.';
comment on column public.drone_jobs.archive_reason is
  'Why the job was archived, in plain words.';

-- 2. Archive the 20 spec, test and cancelled records. Status is left untouched,
--    so restoring a job is one column. Kept live on Adam's word: ZV-2026-0001 and
--    ZV-2026-0002 (the two delivered Zeitview jobs) and SAI-PORT-001 (the Hampton
--    cemetery flight, Droners.io job C7E3FD).
--    Dry run 2026-10-02: an UPDATE on these 20 rows changes no status and no
--    delivery field through the triggers, and enrolls 0 drip emails.
--    After: 3 live, 20 archived, scheduled_emails unchanged at 94.
update public.drone_jobs
   set archived_at = now(),
       archive_reason = 'Spec, test or cancelled record. Archived 2026-10-02 on Adam''s instruction to start the job list fresh.'
 where archived_at is null
   and job_number in (
     'SAI-SPEC-001','SAI-SPEC-002','SAI-SPEC-003','SAI-SPEC-004','SAI-SPEC-005','SAI-SPEC-006',
     'SAI-SPEC-007','SAI-SPEC-008','SAI-SPEC-009','SAI-SPEC-010','SAI-SPEC-011','SAI-SPEC-012',
     'DJ-2026-0003','DJ-2026-0004','DJ-2026-0005','DJ-2026-0006','DJ-2026-0007',
     'ZV-2026-0003','ZV-2026-0004','ZV-2026-0005'
   );

-- To restore every job this migration archived:
--   update public.drone_jobs set archived_at = null, archive_reason = null
--    where archive_reason like 'Spec, test or cancelled record. Archived 2026-10-02%';

-- 3. The snapshot the agent office reads counts live jobs only, and reports how
--    many are archived. Everything outside the jobs and billing job counts is
--    unchanged from the previous definition.
create or replace function public.crm_state_snapshot()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'jobs', jsonb_build_object(
      'total', (SELECT count(*) FROM drone_jobs WHERE archived_at IS NULL),
      'archived', (SELECT count(*) FROM drone_jobs WHERE archived_at IS NOT NULL),
      'by_status', (SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                    FROM (SELECT status::text, count(*) n FROM drone_jobs WHERE archived_at IS NULL GROUP BY status) s),
      'stale_scheduled', (SELECT count(*) FROM drone_jobs
                          WHERE archived_at IS NULL AND status = 'scheduled' AND scheduled_date < current_date),
      'uploaded_awaiting_qa', (SELECT count(*) FROM drone_jobs WHERE archived_at IS NULL AND status = 'uploaded')
    ),
    'drip', jsonb_build_object(
      'by_status', (SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                    FROM (SELECT status::text, count(*) n FROM scheduled_emails GROUP BY status) s),
      'due_now_pending', (SELECT count(*) FROM scheduled_emails
                          WHERE status = 'pending' AND scheduled_for <= now()),
      'last_sent', (SELECT max(sent_at) FROM scheduled_emails WHERE status = 'sent')
    ),
    'leads', jsonb_build_object(
      'total', (SELECT count(*) FROM drone_leads),
      'by_status', (SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                    FROM (SELECT status::text, count(*) n FROM drone_leads GROUP BY status) s),
      'new_7d', (SELECT count(*) FROM drone_leads WHERE created_at >= now() - interval '7 days')
    ),
    'billing', jsonb_build_object(
      'payments_total', (SELECT count(*) FROM payments),
      'payments_pending', (SELECT count(*) FROM payments WHERE status = 'pending'),
      'pending_amount', (SELECT coalesce(sum(amount), 0) FROM payments WHERE status = 'pending'),
      'delivered_unbilled', (SELECT count(*) FROM drone_jobs dj
                             WHERE dj.archived_at IS NULL
                               AND dj.status = 'delivered'
                               AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.quote_id = dj.quote_id))
    ),
    'quotes', jsonb_build_object(
      'by_status', (SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                    FROM (SELECT status::text, count(*) n FROM quotes GROUP BY status) s),
      'accepted_without_job', (SELECT count(*) FROM quotes q
                               WHERE q.status = 'accepted'
                                 AND NOT EXISTS (SELECT 1 FROM drone_jobs dj WHERE dj.quote_id = q.id))
    ),
    'automation', jsonb_build_object(
      'n8n_last_ping', (SELECT max(last_ping) FROM n8n_heartbeat),
      'n8n_minutes_since_ping', (SELECT round(extract(epoch FROM (now() - max(last_ping))) / 60)
                                 FROM n8n_heartbeat)
    )
  );
$function$;
