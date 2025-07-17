-- Skapa systemmallar för försäljning med olika momssatser
-- Dessa ersätter den hårdkodade logiken i save-invoice funktionen

-- Försäljning 25% moms
INSERT INTO airledger_transaction_templates (
  template_name,
  description,
  category,
  is_system_template,
  user_id,
  is_recurring,
  auto_suggest,
  keywords,
  template_entries
) VALUES (
  'Försäljning 25% moms',
  'Försäljning av varor/tjänster med 25% moms',
  'Intäkter',
  true,
  '00000000-0000-0000-0000-000000000000', -- System user
  false,
  true,
  ARRAY['försäljning', 'intäkt', '25%', 'moms', 'faktura', 'kund'],
  '[
    {
      "account_code": "3001",
      "account_name": "Försäljning varor",
      "debit_amount": 0,
      "credit_amount": "{amount_excluding_vat}",
      "description": "Försäljning",
      "is_vat_base": true
    },
    {
      "account_code": "2610", 
      "account_name": "Utgående moms, 25%",
      "debit_amount": 0,
      "credit_amount": "{vat_amount}",
      "description": "Utgående moms 25%",
      "is_vat_account": true,
      "vat_rate": 0.25
    },
    {
      "account_code": "1930",
      "account_name": "Kundfordringar",
      "debit_amount": "{total_amount}",
      "credit_amount": 0,
      "description": "Kundfordran"
    }
  ]'::jsonb
);

-- Försäljning 12% moms  
INSERT INTO airledger_transaction_templates (
  template_name,
  description, 
  category,
  is_system_template,
  user_id,
  is_recurring,
  auto_suggest,
  keywords,
  template_entries
) VALUES (
  'Försäljning 12% moms',
  'Försäljning av varor/tjänster med 12% moms',
  'Intäkter',
  true,
  '00000000-0000-0000-0000-000000000000',
  false,
  true,
  ARRAY['försäljning', 'intäkt', '12%', 'moms', 'faktura', 'kund', 'livsmedel'],
  '[
    {
      "account_code": "3001",
      "account_name": "Försäljning varor", 
      "debit_amount": 0,
      "credit_amount": "{amount_excluding_vat}",
      "description": "Försäljning",
      "is_vat_base": true
    },
    {
      "account_code": "2611",
      "account_name": "Utgående moms, 12%",
      "debit_amount": 0,
      "credit_amount": "{vat_amount}",
      "description": "Utgående moms 12%", 
      "is_vat_account": true,
      "vat_rate": 0.12
    },
    {
      "account_code": "1930",
      "account_name": "Kundfordringar",
      "debit_amount": "{total_amount}",
      "credit_amount": 0,
      "description": "Kundfordran"
    }
  ]'::jsonb
);

-- Försäljning 6% moms
INSERT INTO airledger_transaction_templates (
  template_name,
  description,
  category, 
  is_system_template,
  user_id,
  is_recurring,
  auto_suggest,
  keywords,
  template_entries
) VALUES (
  'Försäljning 6% moms',
  'Försäljning av varor/tjänster med 6% moms', 
  'Intäkter',
  true,
  '00000000-0000-0000-0000-000000000000',
  false,
  true,
  ARRAY['försäljning', 'intäkt', '6%', 'moms', 'faktura', 'kund', 'bok', 'tidning'],
  '[
    {
      "account_code": "3001", 
      "account_name": "Försäljning varor",
      "debit_amount": 0,
      "credit_amount": "{amount_excluding_vat}",
      "description": "Försäljning",
      "is_vat_base": true
    },
    {
      "account_code": "2612",
      "account_name": "Utgående moms, 6%",
      "debit_amount": 0,
      "credit_amount": "{vat_amount}",
      "description": "Utgående moms 6%",
      "is_vat_account": true,
      "vat_rate": 0.06
    },
    {
      "account_code": "1930",
      "account_name": "Kundfordringar", 
      "debit_amount": "{total_amount}",
      "credit_amount": 0,
      "description": "Kundfordran"
    }
  ]'::jsonb
);

-- Försäljning utan moms (momsfri)
INSERT INTO airledger_transaction_templates (
  template_name,
  description,
  category,
  is_system_template, 
  user_id,
  is_recurring,
  auto_suggest,
  keywords,
  template_entries
) VALUES (
  'Försäljning utan moms',
  'Försäljning av momsfria varor/tjänster',
  'Intäkter',
  true,
  '00000000-0000-0000-0000-000000000000',
  false,
  true,
  ARRAY['försäljning', 'intäkt', 'momsfri', 'export', 'utbildning'],
  '[
    {
      "account_code": "3001",
      "account_name": "Försäljning varor",
      "debit_amount": 0,
      "credit_amount": "{total_amount}",
      "description": "Försäljning momsfri"
    },
    {
      "account_code": "1930", 
      "account_name": "Kundfordringar",
      "debit_amount": "{total_amount}",
      "credit_amount": 0,
      "description": "Kundfordran"
    }
  ]'::jsonb
);