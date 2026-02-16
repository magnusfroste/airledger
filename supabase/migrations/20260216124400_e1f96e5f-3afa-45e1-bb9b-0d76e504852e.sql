-- Allow admins to update any user's usage_tracking
CREATE POLICY "Admins can update all usage"
ON public.usage_tracking
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
