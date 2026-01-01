-- Fix security definer views by setting security_invoker = true
-- This ensures RLS policies of the querying user are applied

ALTER VIEW jobs SET (security_invoker = true);
ALTER VIEW packages SET (security_invoker = true);