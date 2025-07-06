-- Add template usage tracking table
CREATE TABLE public.airledger_template_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID NOT NULL,
  transaction_id UUID NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.airledger_template_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for template usage tracking
CREATE POLICY "Users can view their own template usage" 
ON public.airledger_template_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own template usage records" 
ON public.airledger_template_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add columns to transaction templates for better categorization
ALTER TABLE public.airledger_transaction_templates 
ADD COLUMN keywords TEXT[], -- Keywords for AI matching
ADD COLUMN usage_count INTEGER DEFAULT 0, -- Track how often template is used
ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE, -- When template was last used
ADD COLUMN auto_suggest BOOLEAN DEFAULT true; -- Whether AI should auto-suggest this template

-- Create index for better performance on template matching
CREATE INDEX idx_template_keywords ON public.airledger_transaction_templates USING GIN(keywords);
CREATE INDEX idx_template_usage_stats ON public.airledger_template_usage(user_id, template_id, used_at);

-- Update existing templates with keywords for better AI matching
UPDATE public.airledger_transaction_templates 
SET keywords = ARRAY['hyra', 'lokalhyra', 'kontor', 'lokal'] 
WHERE template_name = 'Hyra lokaler';

UPDATE public.airledger_transaction_templates 
SET keywords = ARRAY['el', 'elektricitet', 'elräkning', 'energi'] 
WHERE template_name = 'Elräkning';

UPDATE public.airledger_transaction_templates 
SET keywords = ARRAY['telefon', 'mobilräkning', 'telefonräkning', 'abonnemang'] 
WHERE template_name = 'Telefonräkning';

UPDATE public.airledger_transaction_templates 
SET keywords = ARRAY['försäkring', 'företagsförsäkring', 'ansvar'] 
WHERE template_name = 'Företagsförsäkring';

UPDATE public.airledger_transaction_templates 
SET keywords = ARRAY['material', 'kontorsmaterial', 'papper', 'pennor'] 
WHERE template_name = 'Kontorsmaterial';

UPDATE public.airledger_transaction_templates 
SET keywords = ARRAY['drivmedel', 'bensin', 'diesel', 'bränsle', 'tank'] 
WHERE template_name = 'Drivmedel';

UPDATE public.airledger_transaction_templates 
SET keywords = ARRAY['representation', 'middag', 'lunch', 'kund', 'affärslunch'] 
WHERE template_name = 'Representation';

UPDATE public.airledger_transaction_templates 
SET keywords = ARRAY['skatt', 'preliminärskatt', 'moms', 'f-skatt'] 
WHERE template_name = 'Preliminärskatt';

-- Create function to update template usage statistics
CREATE OR REPLACE FUNCTION public.update_template_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage count and last used date
  UPDATE public.airledger_transaction_templates 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NEW.used_at,
    updated_at = now()
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update template statistics
CREATE TRIGGER update_template_stats_trigger
  AFTER INSERT ON public.airledger_template_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_usage_stats();