-- Phase 9: landing page quote request form submission

CREATE TABLE quote_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  name        text        NOT NULL,
  email       text        NOT NULL,
  phone       text,
  address     text,
  job_type    text,
  description text        NOT NULL,
  status      text        NOT NULL DEFAULT 'new'
);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- Insert-only for anonymous users — no SELECT, UPDATE, or DELETE allowed
-- The CRM (admin role) will access via service role key
CREATE POLICY "anon_insert_quote_requests"
  ON quote_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);
