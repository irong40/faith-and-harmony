-- CRM state snapshot RPC: one read-only call that returns the whole business
-- state as JSON. Powers the observability monitor (agent-office/crm/) and gives
-- the agent workforce live CRM context. SECURITY DEFINER so it can read across
-- RLS-protected tables; EXECUTE restricted to service_role only (never anon).

CREATE OR REPLACE FUNCTION public.crm_state_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'generated_at', now(),

    'jobs', jsonb_build_object(
      'total', (SELECT count(*) FROM drone_jobs),
      'by_status', (SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                    FROM (SELECT status::text, count(*) n FROM drone_jobs GROUP BY status) s),
      'stale_scheduled', (SELECT count(*) FROM drone_jobs
                          WHERE status = 'scheduled' AND scheduled_date < current_date),
      'uploaded_awaiting_qa', (SELECT count(*) FROM drone_jobs WHERE status = 'uploaded')
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
                             WHERE dj.status = 'delivered'
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
$$;

REVOKE ALL ON FUNCTION public.crm_state_snapshot() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_state_snapshot() TO service_role;

COMMENT ON FUNCTION public.crm_state_snapshot() IS
  'Read-only business-state snapshot for the CRM monitor (agent-office/crm/). service_role only.';
