-- Phase 13: Schema Foundation
-- Migration: Create lead_source_channel enum and migrate leads.source_channel column
--
-- This migration converts the existing text column to a typed enum.
-- The USING clause casts existing text values to enum values at migration time.
-- Any row with a source_channel value not in the enum will cause this ALTER to fail —
-- this is intentional. Surface bad data before production deploy rather than after.

-- Step 1: Create the enum type
CREATE TYPE public.lead_source_channel AS ENUM (
  'voice_bot',
  'web_form',
  'manual',
  'email_outreach',
  'social'
);

COMMENT ON TYPE public.lead_source_channel IS 'Source channels for inbound leads. voice_bot = Vapi voice call, web_form = website contact form, manual = admin created, email_outreach = outbound email reply, social = social media inquiry.';

-- Step 2: Drop the existing text default before changing the column type.
-- Postgres cannot auto-cast a text default to enum, so we drop it first
-- and re-set it after the type change.
ALTER TABLE public.leads
  ALTER COLUMN source_channel DROP DEFAULT;

ALTER TABLE public.leads
  ALTER COLUMN source_channel TYPE public.lead_source_channel
    USING source_channel::public.lead_source_channel;

ALTER TABLE public.leads
  ALTER COLUMN source_channel SET DEFAULT 'voice_bot'::public.lead_source_channel;

-- Step 3: Index on source_channel to support Phase 15 filtering queries
CREATE INDEX IF NOT EXISTS idx_leads_source_channel
  ON public.leads (source_channel, created_at DESC);
