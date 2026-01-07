-- Drop the insecure UPDATE policy that allows anyone to update any invoice with a view_token
DROP POLICY IF EXISTS "Public can update invoice payment claim by token" ON invoices;

-- The remaining policies are:
-- 1. "Admins can manage invoices" (ALL) - Admin role required
-- 2. "Public can view invoices by token" (SELECT) - Read-only access via token
-- All payment claim updates will now go through the secure edge function