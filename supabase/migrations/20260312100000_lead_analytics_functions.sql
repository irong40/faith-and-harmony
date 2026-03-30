-- Phase 16 Plan 01: Lead Analytics RPC Function
-- Provides all four analytics metrics in one database call so the UI
-- does not need to run separate queries for each stat card.

CREATE OR REPLACE FUNCTION public.lead_stats(time_window text DEFAULT 'month')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  boundary timestamptz;
  result jsonb;
  conv_total int;
  conv_converted int;
  conv_rate numeric;
  source_breakdown jsonb;
  avg_resp_hours numeric;
  total_revenue numeric;
BEGIN
  -- Compute time boundary from the window parameter
  boundary := CASE time_window
    WHEN 'week' THEN now() - interval '7 days'
    WHEN 'month' THEN now() - interval '30 days'
    WHEN 'all' THEN '1970-01-01'::timestamptz
    ELSE now() - interval '30 days'
  END;

  -- Metric 1: Conversion rate (ANLY-01)
  -- Total leads in the window
  SELECT count(*) INTO conv_total
  FROM leads WHERE created_at >= boundary;

  -- Converted means qualified and linked to a client record
  SELECT count(*) INTO conv_converted
  FROM leads WHERE qualification_status = 'qualified' AND client_id IS NOT NULL AND created_at >= boundary;

  conv_rate := CASE WHEN conv_total > 0
    THEN round((conv_converted::numeric / conv_total) * 100, 1)
    ELSE 0 END;

  -- Metric 2: Leads by source channel (ANLY-02)
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO source_breakdown
  FROM (
    SELECT source_channel AS source, count(*)::int AS count
    FROM leads
    WHERE created_at >= boundary
    GROUP BY source_channel
    ORDER BY count DESC
  ) t;

  -- Metric 3: Average response time in hours (ANLY-03)
  -- Uses the lead_activity view to find the first recorded event per lead.
  -- Only leads that have at least one activity event are included in the average.
  SELECT coalesce(
    round(avg(extract(epoch FROM (first_event - l.created_at)) / 3600.0), 1),
    0
  )
  INTO avg_resp_hours
  FROM leads l
  INNER JOIN LATERAL (
    SELECT min(event_at) AS first_event
    FROM lead_activity la
    WHERE la.lead_id = l.id
  ) fa ON fa.first_event IS NOT NULL
  WHERE l.created_at >= boundary;

  -- Metric 4: Revenue from converted leads (ANLY-04)
  -- Path: leads.client_id to clients.id to drone_jobs.client_id
  -- job_price is stored in cents so divide by 100 to get dollars
  SELECT coalesce(round(sum(dj.job_price) / 100.0, 2), 0)
  INTO total_revenue
  FROM leads l
  JOIN clients c ON l.client_id = c.id
  JOIN drone_jobs dj ON dj.client_id = c.id
  WHERE l.client_id IS NOT NULL
    AND l.created_at >= boundary;

  -- Assemble and return the full result object
  result := jsonb_build_object(
    'time_window', time_window,
    'conversion', jsonb_build_object(
      'total', conv_total,
      'converted', conv_converted,
      'rate', conv_rate
    ),
    'by_source', source_breakdown,
    'response_time', jsonb_build_object('avg_hours', avg_resp_hours),
    'revenue', jsonb_build_object('total_revenue', total_revenue)
  );

  RETURN result;
END;
$$;

-- Grant execute to authenticated users since the analytics page uses the authenticated client
GRANT EXECUTE ON FUNCTION public.lead_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_stats(text) TO service_role;
