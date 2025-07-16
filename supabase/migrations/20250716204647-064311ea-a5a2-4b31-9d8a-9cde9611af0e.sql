-- Uppdatera Kontorsmaterial-mallen med förbättrade keywords och instruktioner
UPDATE public.airledger_transaction_templates 
SET 
  keywords = ARRAY['kontorsmaterial', 'skrivare', 'printer', 'papper', 'pennor', 'material', 'utrustning', 'office', 'kontor', 'supplies'],
  description = 'Inköp av kontorsmaterial som papper, pennor, skrivare etc. INKLUDERAR 25% MOMS. Ange totalbelopp inklusive moms så beräknas exklusive belopp och moms automatiskt.',
  template_entries = '[
    {
      "account_code": "6110",
      "account_name": "Kontorsmaterial", 
      "description": "Kontorsmaterial exkl moms",
      "type": "debit",
      "vat_calculation": "exclude_vat"
    },
    {
      "account_code": "2640", 
      "account_name": "Ingående moms",
      "description": "Moms på material 25%",
      "type": "debit", 
      "vat_calculation": "vat_only"
    },
    {
      "account_code": "1930",
      "account_name": "Företagskonto/checkräkningskonto", 
      "description": "Betalning material",
      "type": "credit",
      "vat_calculation": "total_amount"
    }
  ]'::jsonb
WHERE template_name = 'Kontorsmaterial' AND is_system_template = true;