-- Reconstructed 2026-07-13 from remote supabase_migrations.schema_migrations (applied via MCP 2026-07-04).
-- 2026-07-04: when a platform payout is noted (zeitview_jobs.status -> 'paid'),
-- automatically complete the linked CRM job. Requested by Adam after Gmail
-- reconciliation found approved payouts while drone_jobs sat at uploaded/delivered.

CREATE OR REPLACE FUNCTION complete_crm_job_on_payout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.drone_job_id IS NOT NULL THEN

    IF NEW.awarded_outcome_at IS NULL THEN
      NEW.awarded_outcome_at := now();
    END IF;

    UPDATE drone_jobs
    SET status = 'complete',
        completed_at = COALESCE(completed_at, now()),
        admin_notes = COALESCE(admin_notes, '') || ' | Auto-completed ' || to_char(now(), 'YYYY-MM-DD') || ': platform payout noted (zeitview_jobs status -> paid).',
        updated_at = now()
    WHERE id = NEW.drone_job_id
      AND status IS DISTINCT FROM 'complete';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payout_completes_crm ON zeitview_jobs;
CREATE TRIGGER trg_payout_completes_crm
BEFORE INSERT OR UPDATE OF status ON zeitview_jobs
FOR EACH ROW EXECUTE FUNCTION complete_crm_job_on_payout();
