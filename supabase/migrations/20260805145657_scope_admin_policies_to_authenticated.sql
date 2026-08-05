-- 65 policies were scoped to role `public` (= anon + authenticated) while their
-- USING/WITH CHECK calls has_role(). anon has no EXECUTE on has_role, so anon
-- did not get a clean denial -- it got
--   42501 permission denied for function has_role
-- Postgres evaluates every applicable permissive policy, so one un-executable
-- policy poisons the whole query for anon. Hit three separate ways while
-- auditing: REST on drone_jobs, storage list on drone-jobs, and the storage
-- INSERT policy's EXISTS on drone_jobs.
--
-- Scoping these to `authenticated` cannot lose access:
--   * has_role(auth.uid(), 'admin') requires a uid; auth.uid() is NULL for anon
--   * the only policy here with a non-admin branch is generated_documents
--     "Users can view their own documents", whose branch is
--     (user_id = auth.uid()), and user_id = NULL is NULL for anon -- no match
--   * service_role bypasses RLS entirely, so edge functions are unaffected
--
-- Driven off the catalog rather than a hand-written list so no policy name is
-- typo'd and none is missed.
--
-- Verified after: 0 policies remain `public`-scoped with has_role (97 are now
-- `authenticated`). anon reads of drone_jobs and clients return a clean
-- 200 [] instead of 401/42501. The public storefront still works -- anon reads
-- drone_packages and gets live prices. Admin unchanged: 20 drone_jobs,
-- 7 clients, 4 report_images, 1 drone-jobs object, 4 report-images objects.
-- Pilot unchanged: 3 own missions, 1 client on them.
--
-- KNOWN, NOT FIXED HERE -- the client upload path is still non-functional.
-- "Token holders can upload drone files" (INSERT, anon) contains
-- EXISTS (SELECT 1 FROM drone_jobs ...). That no longer errors, but now cleanly
-- returns false, because no policy grants anon SELECT on drone_jobs -- the one
-- that used to was dropped in 20260805143509 for checking token EXISTENCE
-- rather than possession. Restoring anything like it would re-open that hole,
-- so it is deliberately left closed.
--
-- Nothing regressed: `drone_jobs.upload_token` has never been non-null on any
-- row, there are zero client-uploaded objects under any /raw/ prefix, and the
-- path errored with 42501 before today anyway. The feature has never worked and
-- has never been used.
--
-- The correct fix is for drone-job-token to hand the browser a
-- createSignedUploadUrl and for DroneUpload to call uploadToSignedUrl, after
-- which the anon INSERT policy can be dropped entirely and no RLS-visible
-- token check is needed. That is a code change wanting a live upload to verify.

do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where 'public' = any(roles)
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%has_role%'
    order by schemaname, tablename, policyname
  loop
    execute format('alter policy %I on %I.%I to authenticated',
                   r.policyname, r.schemaname, r.tablename);
    n := n + 1;
  end loop;
  raise notice 'rescoped % policies to authenticated', n;
end $$;
