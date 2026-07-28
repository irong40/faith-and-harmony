-- 025: Drop the dead social_post_metrics schema. Never received a row
-- (n_tup_ins = 0 lifetime as of 2026-07-26); public.performance_metrics is the
-- live engagement store. Kept only as a decoy that reads as "pipeline dead".
drop view if exists public.social_post_metrics_latest;
drop table if exists public.social_post_metrics;
