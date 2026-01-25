-- RLS Policy: Allow pilots to update their assigned jobs
ALTER TABLE drone_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pilots can update own missions" ON drone_jobs FOR
UPDATE USING (auth.uid() = pilot_id);
CREATE POLICY "Pilots can view own missions" ON drone_jobs FOR
SELECT USING (auth.uid() = pilot_id);
-- AUTOMATION: Trigger to auto-complete job when flight is logged
CREATE OR REPLACE FUNCTION public.handle_flight_log_created() RETURNS TRIGGER AS $$ BEGIN -- Update the mission status to 'complete'
UPDATE drone_jobs
SET status = 'complete',
    updated_at = now()
WHERE id = new.mission_id;
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Bind trigger to flight_logs insert
DROP TRIGGER IF EXISTS on_flight_log_created ON flight_logs;
CREATE TRIGGER on_flight_log_created
AFTER
INSERT ON flight_logs FOR EACH ROW EXECUTE FUNCTION public.handle_flight_log_created();