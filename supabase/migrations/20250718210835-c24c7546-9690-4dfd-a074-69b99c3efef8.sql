
-- Lägg till ny systemmall för kundbetalningar
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
  'Kundbetalning', 
  'Betalning från kund som minskar kundfordran', 
  'payment', 
  false, 
  null, 
  '[
    {"account_code": "1930", "account_name": "Checkkonto", "type": "debit", "description": "Inbetalning från kund"},
    {"account_code": "1510", "account_name": "Kundfordringar", "type": "credit", "description": "Minskning av kundfordran"}
  ]'::jsonb,
  true,
  ARRAY['betalning', 'kundbetalning', 'inbetalning', 'betalat', 'betalt', 'fått betalning']
);

-- Lägg även till mall för kontantbetalning (alternativ till checkkonto)
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
  'Kontantbetalning från kund', 
  'Kontantbetalning från kund som minskar kundfordran', 
  'payment', 
  false, 
  null, 
  '[
    {"account_code": "1910", "account_name": "Kassa", "type": "debit", "description": "Kontantinbetalning från kund"},
    {"account_code": "1510", "account_name": "Kundfordringar", "type": "credit", "description": "Minskning av kundfordran"}
  ]'::jsonb,
  true,
  ARRAY['kontant', 'kontantbetalning', 'cash', 'kassa']
);
