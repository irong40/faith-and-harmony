-- M3: delivery_status is the source of truth for delivered-ness; keep
-- status/delivered_at in lockstep. No-op unless delivery_status actually
-- changes (drone_jobs carries 7+ triggers; same-event firing is
-- alphabetical — 'zz_' prefix runs this last). portfolio_complete is a
-- terminal state for speculative work and must NOT stamp delivered_at.
CREATE OR REPLACE FUNCTION sync_delivery_state() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.delivery_status IS DISTINCT FROM OLD.delivery_status
     AND NEW.delivery_status IN ('sent','delivery_confirmed') THEN
    NEW.status := 'delivered';
    NEW.delivered_at := coalesce(NEW.delivered_at, OLD.delivered_at, now());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_sync_delivery_state ON drone_jobs;
CREATE TRIGGER zz_sync_delivery_state BEFORE UPDATE ON drone_jobs
  FOR EACH ROW EXECUTE FUNCTION sync_delivery_state();
