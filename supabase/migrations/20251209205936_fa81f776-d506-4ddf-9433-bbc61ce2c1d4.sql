-- Allow admins to delete service requests
CREATE POLICY "Admins can delete service requests"
ON public.service_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));