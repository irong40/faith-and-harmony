-- =====================================================
-- Phase 6: Pilot-scoped RLS policies for drone_jobs
-- =====================================================
-- Replaces the simple pilot_id = auth.uid() policies
-- from 20260124174500_automate_workflow.sql with
-- explicit admin OR pilot scoping using has_role().
-- Also adds pilot scoping for processing_jobs.

-- -----------------------------------------------
-- drone_jobs: Replace pilot SELECT/UPDATE policies
-- -----------------------------------------------
DROP POLICY IF EXISTS "Pilots can view own missions" ON public.drone_jobs;
DROP POLICY IF EXISTS "Pilots can update own missions" ON public.drone_jobs;

-- Pilots see their own missions; admins see everything
CREATE POLICY "Pilots see own missions"
  ON public.drone_jobs FOR SELECT TO authenticated
  USING (
    pilot_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Pilots can update their own assigned missions; admins can update all
CREATE POLICY "Pilots update own missions"
  ON public.drone_jobs FOR UPDATE TO authenticated
  USING (
    pilot_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    pilot_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- -----------------------------------------------
-- processing_jobs: Add pilot read access
-- -----------------------------------------------
-- Pilots can see processing status for their own missions
CREATE POLICY "Pilots can view own processing jobs"
  ON public.processing_jobs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drone_jobs
      WHERE drone_jobs.id = processing_jobs.mission_id
        AND (
          drone_jobs.pilot_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- -----------------------------------------------
-- mission_weather_logs: Add pilot insert access
-- -----------------------------------------------
-- Pilots need to insert weather logs for their pre-flight
CREATE POLICY "Pilots can insert own mission weather logs"
  ON public.mission_weather_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drone_jobs
      WHERE drone_jobs.id = mission_weather_logs.mission_id
        AND drone_jobs.pilot_id = auth.uid()
    )
  );
