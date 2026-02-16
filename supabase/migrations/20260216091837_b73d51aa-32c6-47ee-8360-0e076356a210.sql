
-- Insert 3 new system templates for tax transactions
INSERT INTO airledger_transaction_templates (template_name, description, category, keywords, is_system_template, auto_suggest, template_entries)
VALUES
  (
    'Skatteåterbetalning från Skatteverket',
    'Återbetalning av skatt från Skatteverket till bankkonto',
    'skatt',
    ARRAY['skatteverket', 'återbetalning', 'sk55', 'preliminärskatt', 'skatteåterbetalning'],
    true,
    true,
    '[
      {"type": "debit", "account_code": "1930", "account_name": "Bankkonto", "amount_calculation": "full_amount"},
      {"type": "credit", "account_code": "1640", "account_name": "Skattefordringar", "amount_calculation": "full_amount"}
    ]'::jsonb
  ),
  (
    'Inbetalning preliminärskatt (F-skatt)',
    'Betalning av preliminärskatt/F-skatt till Skatteverket',
    'skatt',
    ARRAY['preliminärskatt', 'f-skatt', 'debiterad skatt', 'skatteverket', 'preliminär skatt'],
    true,
    true,
    '[
      {"type": "debit", "account_code": "1640", "account_name": "Skattefordringar", "amount_calculation": "full_amount"},
      {"type": "credit", "account_code": "1930", "account_name": "Bankkonto", "amount_calculation": "full_amount"}
    ]'::jsonb
  ),
  (
    'Slutlig skatt',
    'Betalning av slutlig skatt, kvarskatt eller restskatt',
    'skatt',
    ARRAY['slutlig skatt', 'kvarskatt', 'restskatt', 'slutskatt'],
    true,
    true,
    '[
      {"type": "debit", "account_code": "2510", "account_name": "Skatteskulder", "amount_calculation": "full_amount"},
      {"type": "credit", "account_code": "1930", "account_name": "Bankkonto", "amount_calculation": "full_amount"}
    ]'::jsonb
  )
ON CONFLICT DO NOTHING;
