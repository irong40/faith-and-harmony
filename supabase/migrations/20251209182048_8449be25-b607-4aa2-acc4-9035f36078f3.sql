-- Create waitlist table for product notifications
CREATE TABLE public.product_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(email, product_id)
);

-- Enable RLS
ALTER TABLE public.product_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public signup)
CREATE POLICY "Anyone can join waitlist"
ON public.product_waitlist
FOR INSERT
WITH CHECK (true);

-- Only admins can view/manage waitlist
CREATE POLICY "Admins can view waitlist"
ON public.product_waitlist
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update waitlist"
ON public.product_waitlist
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete from waitlist"
ON public.product_waitlist
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));