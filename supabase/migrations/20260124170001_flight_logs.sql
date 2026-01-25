-- Create flight_logs table for SOP compliance tracking
-- Part of Trestle Pilot Portal - stores completed pre-flight checklists
CREATE TABLE IF NOT EXISTS flight_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mission_id UUID REFERENCES drone_jobs(id) ON DELETE CASCADE NOT NULL,
    pilot_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    checklist_data JSONB NOT NULL,
    flight_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_flight_logs_mission_id ON flight_logs(mission_id);
CREATE INDEX IF NOT EXISTS idx_flight_logs_pilot_id ON flight_logs(pilot_id);
CREATE INDEX IF NOT EXISTS idx_flight_logs_flight_timestamp ON flight_logs(flight_timestamp);
-- Enable Row Level Security
ALTER TABLE flight_logs ENABLE ROW LEVEL SECURITY;
-- Pilots can insert their own flight logs
CREATE POLICY "Pilots can insert own flight logs" ON flight_logs FOR
INSERT WITH CHECK (auth.uid() = pilot_id);
-- Pilots can view their own flight logs
CREATE POLICY "Pilots can view own flight logs" ON flight_logs FOR
SELECT USING (auth.uid() = pilot_id);
-- Admins can view all flight logs (using has_role function)
CREATE POLICY "Admins can view all flight logs" ON flight_logs FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM user_roles
            WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'admin'
        )
    );
-- Add comments for documentation
COMMENT ON TABLE flight_logs IS 'Audit trail for completed drone flights with SOP checklist data';
COMMENT ON COLUMN flight_logs.checklist_data IS 'JSONB containing all pre-flight checklist items with timestamps';
COMMENT ON COLUMN flight_logs.device_id IS 'Unique device identifier for conflict tracking';