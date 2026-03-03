-- Add brand_slug FK to quote_requests (DEFAULT 'sai' backfills all existing rows)
ALTER TABLE public.quote_requests
  ADD COLUMN brand_slug text NOT NULL DEFAULT 'sai'
    REFERENCES public.brands(slug) ON DELETE RESTRICT;

CREATE INDEX idx_quote_requests_brand_slug ON public.quote_requests(brand_slug);
