-- Create transaction templates table
CREATE TABLE public.airledger_transaction_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'tax', 'salary', 'rent', 'utilities', etc.
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT, -- 'monthly', 'quarterly', 'yearly'
  template_entries JSONB NOT NULL, -- Array of entries with account_code, account_name, debit/credit logic
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.airledger_transaction_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own templates" 
ON public.airledger_transaction_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.airledger_transaction_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.airledger_transaction_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.airledger_transaction_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_transaction_templates_updated_at
BEFORE UPDATE ON public.airledger_transaction_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert common Swedish business transaction templates
INSERT INTO public.airledger_transaction_templates (user_id, template_name, description, category, is_recurring, recurring_frequency, template_entries) VALUES
-- Preliminärskatt template (based on user's image)
('00000000-0000-0000-0000-000000000000', 'Preliminärskatt betalning', 'Månadsvis betalning av preliminärskatt', 'tax', true, 'monthly', 
'[
  {"account_code": "1630", "account_name": "Avräkning för skatter och avgifter", "type": "debit", "description": "Avräkning skatt"},
  {"account_code": "1930", "account_name": "Checkkonto", "type": "credit", "description": "Betalning via bank"}
]'::jsonb),

-- Salary template
('00000000-0000-0000-0000-000000000000', 'Löneutbetalning', 'Månadsvis löneutbetalning till anställd', 'salary', true, 'monthly',
'[
  {"account_code": "7210", "account_name": "Löner", "type": "debit", "description": "Bruttolön"},
  {"account_code": "2510", "account_name": "Skatteskulder", "type": "credit", "description": "Preliminärskatt och sociala avgifter"},
  {"account_code": "1930", "account_name": "Checkkonto", "type": "credit", "description": "Nettolön till anställd"}
]'::jsonb),

-- Rent template
('00000000-0000-0000-0000-000000000000', 'Lokalhyra', 'Månadsvis hyra för lokaler', 'rent', true, 'monthly',
'[
  {"account_code": "6000", "account_name": "Lokalhyra", "type": "debit", "description": "Hyra lokaler"},
  {"account_code": "1930", "account_name": "Checkkonto", "type": "credit", "description": "Betalning hyra"}
]'::jsonb),

-- Bank fees template
('00000000-0000-0000-0000-000000000000', 'Bankavgifter', 'Månadsvis bankavgifter', 'banking', true, 'monthly',
'[
  {"account_code": "6830", "account_name": "Bankavgifter", "type": "debit", "description": "Bankavgifter"},
  {"account_code": "1930", "account_name": "Checkkonto", "type": "credit", "description": "Avgift draget från konto"}
]'::jsonb),

-- Insurance template
('00000000-0000-0000-0000-000000000000', 'Försäkringar', 'Betalning av företagsförsäkringar', 'insurance', false, null,
'[
  {"account_code": "6850", "account_name": "Försäkringar", "type": "debit", "description": "Försäkringspremie"},
  {"account_code": "1930", "account_name": "Checkkonto", "type": "credit", "description": "Betalning försäkring"}
]'::jsonb);