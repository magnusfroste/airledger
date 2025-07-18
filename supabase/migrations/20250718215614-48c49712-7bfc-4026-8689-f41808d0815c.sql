
-- Add new system template for when Tax Agency withdraws preliminary tax
INSERT INTO public.airledger_transaction_templates (
  user_id, 
  template_name, 
  description, 
  category, 
  is_recurring, 
  recurring_frequency, 
  template_entries,
  is_system_template,
  keywords
) VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'Skatteverket drar preliminärskatt', 
  'Skatteverket drar preliminärskatt från avräkningskonto till skatteskulder', 
  'tax', 
  false, 
  null, 
  '[
    {"account_code": "1630", "account_name": "Avräkning för skatter och avgifter", "type": "credit", "description": "Skatteverket drar belopp"},
    {"account_code": "2510", "account_name": "Skatteskulder", "type": "debit", "description": "Överföring till skuld"}
  ]'::jsonb,
  true,
  ARRAY['skatteverket', 'drar', 'preliminärskatt', 'uttag', 'avräkning', 'skatteskuld']
);
