-- BD / Contract Intelligence: bd_stats RPC
-- Returns all BD dashboard metrics in one jsonb call (mirrors public.lead_stats).
-- Windowed on when we REVIEWED the opportunity: coalesce(evaluated_date, created_at::date).
-- Current-state cards (open_now, evaluated_this_week) are intentionally NOT windowed.

CREATE OR REPLACE FUNCTION public.bd_stats(time_window text DEFAULT 'all')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  boundary date;
  result jsonb;

  reviewed int; screened_out int; no_bid int; bid int; submitted int; won int; lost int;
  win_rate numeric;
  open_now int; evaluated_this_week int;

  by_source jsonb; by_naics jsonb; by_psc jsonb; by_agency jsonb;
  by_set_aside jsonb; by_decision jsonb; by_state jsonb;
BEGIN
  boundary := CASE time_window
    WHEN 'week'    THEN (now() - interval '7 days')
    WHEN 'month'   THEN (now() - interval '30 days')
    WHEN 'quarter' THEN (now() - interval '90 days')
    WHEN 'year'    THEN (now() - interval '365 days')
    WHEN 'all'     THEN '1970-01-01'
    ELSE '1970-01-01'
  END::date;

  -- ---- Funnel counts (windowed) --------------------------------------------
  SELECT
    count(*),
    count(*) FILTER (WHERE decision = 'SCREENED-OUT'),
    count(*) FILTER (WHERE decision = 'NO-BID'),
    count(*) FILTER (WHERE decision = 'BID'),
    count(*) FILTER (WHERE submitted_at IS NOT NULL),
    count(*) FILTER (WHERE outcome = 'won'),
    count(*) FILTER (WHERE outcome = 'lost')
  INTO reviewed, screened_out, no_bid, bid, submitted, won, lost
  FROM public.bd_opportunities
  WHERE coalesce(evaluated_date, created_at::date) >= boundary;

  win_rate := CASE WHEN (won + lost) > 0
    THEN round((won::numeric / (won + lost)) * 100, 1)
    ELSE 0 END;

  -- ---- Current-state cards (NOT windowed) ----------------------------------
  SELECT count(*) INTO open_now
  FROM public.bd_opportunities
  WHERE response_deadline >= now()
    AND coalesce(decision, '') <> 'SCREENED-OUT';

  SELECT count(*) INTO evaluated_this_week
  FROM public.bd_opportunities
  WHERE coalesce(evaluated_date, created_at::date) >= (now() - interval '7 days')::date;

  -- ---- Breakdowns (windowed). Null/blank keys grouped as 'Unknown'. ---------
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_source FROM (
    SELECT source AS key, count(*)::int AS count
    FROM public.bd_opportunities
    WHERE coalesce(evaluated_date, created_at::date) >= boundary
    GROUP BY source ORDER BY count DESC
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_naics FROM (
    SELECT coalesce(nullif(naics_code, ''), 'Unknown') AS key, count(*)::int AS count
    FROM public.bd_opportunities
    WHERE coalesce(evaluated_date, created_at::date) >= boundary
    GROUP BY 1 ORDER BY count DESC LIMIT 12
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_psc FROM (
    SELECT coalesce(nullif(psc_code, ''), 'Unknown') AS key, count(*)::int AS count
    FROM public.bd_opportunities
    WHERE coalesce(evaluated_date, created_at::date) >= boundary
    GROUP BY 1 ORDER BY count DESC LIMIT 12
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_agency FROM (
    SELECT coalesce(nullif(agency, ''), 'Unknown') AS key, count(*)::int AS count
    FROM public.bd_opportunities
    WHERE coalesce(evaluated_date, created_at::date) >= boundary
    GROUP BY 1 ORDER BY count DESC LIMIT 12
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_set_aside FROM (
    SELECT coalesce(nullif(set_aside, ''), 'Unknown') AS key, count(*)::int AS count
    FROM public.bd_opportunities
    WHERE coalesce(evaluated_date, created_at::date) >= boundary
    GROUP BY 1 ORDER BY count DESC LIMIT 12
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_decision FROM (
    SELECT coalesce(nullif(decision, ''), 'Unknown') AS key, count(*)::int AS count
    FROM public.bd_opportunities
    WHERE coalesce(evaluated_date, created_at::date) >= boundary
    GROUP BY 1 ORDER BY count DESC
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_state FROM (
    SELECT coalesce(nullif(place_state, ''), 'Unknown') AS key, count(*)::int AS count
    FROM public.bd_opportunities
    WHERE coalesce(evaluated_date, created_at::date) >= boundary
    GROUP BY 1 ORDER BY count DESC LIMIT 20
  ) t;

  result := jsonb_build_object(
    'time_window', time_window,
    'funnel', jsonb_build_object(
      'reviewed', reviewed,
      'screened_out', screened_out,
      'no_bid', no_bid,
      'bid', bid,
      'submitted', submitted,
      'won', won,
      'lost', lost
    ),
    'win_rate', win_rate,
    'open_now', open_now,
    'evaluated_this_week', evaluated_this_week,
    'by_source', by_source,
    'by_naics', by_naics,
    'by_psc', by_psc,
    'by_agency', by_agency,
    'by_set_aside', by_set_aside,
    'by_decision', by_decision,
    'by_state', by_state
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bd_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bd_stats(text) TO service_role;
