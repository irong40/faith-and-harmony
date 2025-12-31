-- Add RLS policy to allow reading service requests via proposal token
CREATE POLICY "Public can view service requests via proposal token" 
ON public.service_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.proposals 
    WHERE proposals.service_request_id = service_requests.id 
    AND proposals.approval_token IS NOT NULL
  )
);