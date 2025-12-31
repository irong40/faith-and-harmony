-- Fix security definer views by recreating with security_invoker = true
DROP VIEW IF EXISTS public.drone_pipeline_summary;
DROP VIEW IF EXISTS public.drone_client_summary;

-- Recreate view for pipeline summary with security invoker
CREATE VIEW public.drone_pipeline_summary 
WITH (security_invoker = true) AS
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as with_email,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as new_this_week
FROM public.drone_leads
GROUP BY status;

-- Recreate view for client summary with security invoker
CREATE VIEW public.drone_client_summary 
WITH (security_invoker = true) AS
SELECT
  dl.id,
  dl.company_name,
  dl.city,
  dl.portfolio_type,
  COUNT(de.id) as total_engagements,
  COUNT(de.id) FILTER (WHERE de.engagement_date > now() - interval '30 days') as engagements_this_month,
  SUM(de.actual_revenue) as total_revenue,
  AVG(de.satisfaction_score) as avg_satisfaction,
  MAX(de.engagement_date) as last_engagement,
  MIN(de.engagement_date) FILTER (WHERE de.status = 'scheduled' AND de.engagement_date >= CURRENT_DATE) as next_scheduled
FROM public.drone_leads dl
LEFT JOIN public.drone_engagements de ON de.lead_id = dl.id
WHERE dl.status = 'client'
GROUP BY dl.id, dl.company_name, dl.city, dl.portfolio_type;