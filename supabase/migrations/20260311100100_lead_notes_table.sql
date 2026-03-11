-- Phase 13: Schema Foundation
-- Migration: Create lead_notes table with RLS, constraints, indexes, and updated_at trigger
--
-- lead_notes stores admin annotations on individual leads.
-- Supports reason tagging (not_ready, wrong_area, needs_callback, price_sensitive)
-- and follow-up scheduling via follow_up_at.
-- Access is restricted to admin role via RLS. Service role retains full access
-- for edge function operations.

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL,

  lead_id       uuid        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content       text        NOT NULL CHECK (char_length(content) > 0),
  reason_tag    text        CHECK (reason_tag IN ('not_ready', 'wrong_area', 'needs_callback', 'price_sensitive')),
  follow_up_at  timestamptz,

  created_by    uuid        REFERENCES auth.users(id)
);

COMMENT ON TABLE public.lead_notes IS 'Admin notes on voice bot leads. Supports reason tags and follow-up scheduling. Admin access only via RLS.';

-- Step 2: Enable RLS
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Step 3: RLS policies matching project pattern
-- Service role full access (used by edge functions via SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "service_role_all" ON public.lead_notes
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin full access using has_role helper
CREATE POLICY "admins_all_lead_notes" ON public.lead_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Step 4: Indexes
-- Primary lookup: notes for a specific lead ordered by creation time
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id
  ON public.lead_notes (lead_id, created_at DESC);

-- Partial index: upcoming follow-ups (NULL follow_up_at rows are excluded)
CREATE INDEX IF NOT EXISTS idx_lead_notes_follow_up_at
  ON public.lead_notes (follow_up_at)
  WHERE follow_up_at IS NOT NULL;

-- Step 5: updated_at trigger using moddatetime extension
CREATE TRIGGER set_lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
