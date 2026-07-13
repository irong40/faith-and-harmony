-- Security hardening per Supabase security advisors (2026-07-13).
-- Scope: remove anonymous/public API exposure flagged by the linter without
-- touching anything the public site legitimately does (quote form inserts,
-- product pages) or service-key automation (n8n, sortie, edge functions —
-- service_role bypasses RLS and keeps its own grants).
--
-- 1) SECURITY DEFINER views: these bypass RLS of the querying user and were
--    SELECT-able by anon (P&L, lead activity, job schedules). Only
--    lead_activity is used by the admin UI (LeadDetailDrawer) — it keeps
--    authenticated SELECT; the rest are ops/reporting views for service-key
--    tooling only.
revoke all on public.bees360_clearance_needed  from anon, authenticated;
revoke all on public.bees360_daily_summary     from anon, authenticated;
revoke all on public.cost_summary              from anon, authenticated;
revoke all on public.zeitview_today            from anon, authenticated;
revoke all on public.zeitview_tomorrow         from anon, authenticated;
revoke all on public.quote_attribution         from anon, authenticated;
revoke all on public.marketplace_lead_opportunities from anon, authenticated;
revoke all on public.marketplace_pl_summary    from anon, authenticated;
revoke all on public.lead_activity             from anon;

-- 2) Tables with always-true policies scoped to {public} (anon had full
--    write access). Both are pipeline-internal; only service_role needs them.
drop policy if exists "Allow all for service role" on public.publish_reports;
create policy "Service role manages publish_reports"
  on public.publish_reports for all to service_role
  using (true) with check (true);
revoke all on public.publish_reports from anon, authenticated;

drop policy if exists "Service role full access" on public.workflow_locks;
create policy "Service role manages workflow_locks"
  on public.workflow_locks for all to service_role
  using (true) with check (true);
revoke all on public.workflow_locks from anon, authenticated;

-- 3) SECURITY DEFINER functions: EXECUTE was granted via PUBLIC, so anon
--    could invoke every RPC-callable one (incl. generate_app_api_key).
--    Revoke from PUBLIC/anon; re-grant to authenticated (admin UI RPCs:
--    has_role, lead_stats, bd_stats, delete_accessory_safe) and
--    service_role (n8n / pipeline / edge functions).
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'auto_advance_drone_job_status','bd_stats','create_drone_job_from_quote',
        'delete_accessory_safe','fn_marketplace_lead_notify_review',
        'fn_marketplace_lead_to_mission','generate_app_api_key',
        'get_app_announcements','handle_flight_log_created','handle_new_user',
        'has_role','lead_stats','log_flight','on_drone_job_delivered',
        'on_quote_accepted','record_app_heartbeat','register_app_with_bootstrap',
        'revoke_app_api_key','send_notification_email','sync_flight_to_fleet',
        'upsert_customer_from_quote_request','validate_api_key')
  loop
    execute format('revoke execute on function %s from public', fn.sig);
    execute format('revoke execute on function %s from anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;

-- 4) Pin search_path on flagged functions (mutable search_path allows
--    schema-shadowing attacks against SECURITY DEFINER functions).
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'assign_logo_variant','auto_advance_drone_job_status','bd_stats',
        'check_duplicate_topic','complete_crm_job_on_payout',
        'fn_marketplace_lead_notify_review','fn_marketplace_lead_to_mission',
        'get_lru_voice','get_topic_winners','handle_flight_log_created',
        'handle_new_user','lead_stats','opord_proposals_set_updated_at',
        'payments_set_updated_at','set_processing_jobs_updated_at',
        'set_quotes_updated_at','set_updated_at','update_clients_updated_at',
        'update_pipeline_runs_updated_at','update_processing_templates_updated_at')
  loop
    execute format('alter function %s set search_path = public', fn.sig);
  end loop;
end $$;

-- Not addressed here (intentional):
--   * rls_enabled_no_policy on bees360_*/zeitview_jobs/n8n_failures — locked
--     to service_role by design.
--   * pg_trgm in public schema — relocation is disruptive, negligible risk.
--   * public bucket listing on product-images / watermark-previews — public
--     content by design.
--   * auth signup + leaked-password protection — dashboard settings, not SQL.
