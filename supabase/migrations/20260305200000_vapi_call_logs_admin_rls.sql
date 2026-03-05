-- Phase 6: Integration and Edge Cases
-- Add admin read access to vapi_call_logs so the Call Logs admin page can query them
-- Pattern matches leads table (20260303100000) using has_role function

CREATE POLICY "admins_read_vapi_call_logs" ON public.vapi_call_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
