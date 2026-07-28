ALTER TABLE drone_jobs DROP CONSTRAINT drone_jobs_delivery_status_check;
ALTER TABLE drone_jobs ADD CONSTRAINT drone_jobs_delivery_status_check
  CHECK (delivery_status = ANY (ARRAY['not_ready'::text, 'ready'::text, 'sent'::text, 'delivery_confirmed'::text, 'portfolio_complete'::text]));
