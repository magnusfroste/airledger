-- Add a system_template flag to distinguish between user templates and system templates
ALTER TABLE public.airledger_transaction_templates 
ADD COLUMN is_system_template BOOLEAN NOT NULL DEFAULT false;

-- Update existing templates to be system templates
UPDATE public.airledger_transaction_templates 
SET is_system_template = true 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Update the select policy to allow users to see system templates + their own templates
DROP POLICY "Users can view their own templates" ON public.airledger_transaction_templates;

CREATE POLICY "Users can view system templates and their own templates" 
ON public.airledger_transaction_templates 
FOR SELECT 
USING (is_system_template = true OR auth.uid() = user_id);

-- Add policy for admins to manage system templates (we'll need to create admin role later)
-- For now, let authenticated users create system templates (can be restricted later)
CREATE POLICY "System templates management" 
ON public.airledger_transaction_templates 
FOR ALL
USING (is_system_template = true)
WITH CHECK (is_system_template = true);