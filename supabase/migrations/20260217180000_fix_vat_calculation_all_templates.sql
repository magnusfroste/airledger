-- Fix vat_calculation for all templates that need VAT calculations
-- This ensures correct net/VAT/gross amounts are displayed

-- ============================================
-- FÖRSÄLJNING VAROR (nya mallar)
-- ============================================

-- Försäljning varor 25%
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "1510", "account_name": "Kundfordringar", "type": "debit", "vat_calculation": "total_amount"},
  {"account_code": "3001", "account_name": "Försäljning varor inom Sverige, 25% moms", "type": "credit", "vat_calculation": "exclude_vat"},
  {"account_code": "2610", "account_name": "Utgående moms, 25%", "type": "credit", "vat_calculation": "vat_only"}
]'::jsonb
WHERE template_name = 'Försäljning varor 25%';

-- Försäljning varor 12%
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "1510", "account_name": "Kundfordringar", "type": "debit", "vat_calculation": "total_amount"},
  {"account_code": "3002", "account_name": "Försäljning varor inom Sverige, 12% moms", "type": "credit", "vat_calculation": "exclude_vat_12"},
  {"account_code": "2620", "account_name": "Utgående moms, 12%", "type": "credit", "vat_calculation": "vat_only_12"}
]'::jsonb
WHERE template_name = 'Försäljning varor 12%';

-- Försäljning varor 6%
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "1510", "account_name": "Kundfordringar", "type": "debit", "vat_calculation": "total_amount"},
  {"account_code": "3003", "account_name": "Försäljning varor inom Sverige, 6% moms", "type": "credit", "vat_calculation": "exclude_vat_6"},
  {"account_code": "2630", "account_name": "Utgående moms, 6%", "type": "credit", "vat_calculation": "vat_only_6"}
]'::jsonb
WHERE template_name = 'Försäljning varor 6%';

-- ============================================
-- BETALNINGAR
-- ============================================

-- Kortbetalning försäljning
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "1580", "account_name": "Fordran kortinlösen", "type": "debit", "vat_calculation": "total_amount"},
  {"account_code": "3001", "account_name": "Försäljning inom Sverige, 25% moms", "type": "credit", "vat_calculation": "exclude_vat"},
  {"account_code": "2610", "account_name": "Utgående moms, 25%", "type": "credit", "vat_calculation": "vat_only"}
]'::jsonb
WHERE template_name = 'Kortbetalning försäljning';

-- ============================================
-- PERSONAL
-- ============================================

-- Utlägg anställd
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "6991", "account_name": "Övriga externa kostnader", "type": "debit", "vat_calculation": "exclude_vat"},
  {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "vat_calculation": "vat_only"},
  {"account_code": "2820", "account_name": "Kortfristiga skulder till anställda", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Utlägg anställd';

-- ============================================
-- BEFINTLIGA MALLAR SOM SAKNAR vat_calculation
-- ============================================

-- Taxi tjänsteresa (om den finns)
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "5820", "account_name": "Hyrbil och taxi", "type": "debit", "vat_calculation": "exclude_vat"},
  {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "vat_calculation": "vat_only"},
  {"account_code": "1930", "account_name": "Företagskonto", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Taxi tjänsteresa';

-- Tjänsteresa tåg/flyg
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "5810", "account_name": "Biljetter tåg och flyg", "type": "debit", "vat_calculation": "exclude_vat"},
  {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "vat_calculation": "vat_only"},
  {"account_code": "1930", "account_name": "Företagskonto", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Tjänsteresa tåg/flyg';

-- Hotell tjänsteresa
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "5830", "account_name": "Kost och logi", "type": "debit", "vat_calculation": "exclude_vat_12"},
  {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "vat_calculation": "vat_only_12"},
  {"account_code": "1930", "account_name": "Företagskonto", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Hotell tjänsteresa';

-- Extern representation mat
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "6071", "account_name": "Representation, avdragsgill", "type": "debit", "vat_calculation": "exclude_vat_12"},
  {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "vat_calculation": "vat_only_12"},
  {"account_code": "1930", "account_name": "Företagskonto", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Extern representation mat';

-- Mobiltelefon abonnemang
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "6212", "account_name": "Mobiltelefon", "type": "debit", "vat_calculation": "exclude_vat"},
  {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "vat_calculation": "vat_only"},
  {"account_code": "1930", "account_name": "Företagskonto", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Mobiltelefon abonnemang';

-- Inköp dator/laptop
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "1250", "account_name": "Datorer", "type": "debit", "vat_calculation": "exclude_vat"},
  {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "vat_calculation": "vat_only"},
  {"account_code": "1930", "account_name": "Företagskonto", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Inköp dator/laptop';

-- Företagsförsäkring (momsfri)
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "6310", "account_name": "Företagsförsäkringar", "type": "debit", "vat_calculation": "total_amount"},
  {"account_code": "1930", "account_name": "Företagskonto", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Företagsförsäkring';

-- Friskvårdsbidrag (momsfri)
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "7690", "account_name": "Övriga personalkostnader", "type": "debit", "vat_calculation": "total_amount"},
  {"account_code": "1930", "account_name": "Företagskonto", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Friskvårdsbidrag';

-- Kontorslokal hyra med moms
UPDATE airledger_transaction_templates
SET template_entries = '[
  {"account_code": "5010", "account_name": "Lokalhyra", "type": "debit", "vat_calculation": "exclude_vat"},
  {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "vat_calculation": "vat_only"},
  {"account_code": "1930", "account_name": "Företagskonto", "type": "credit", "vat_calculation": "total_amount"}
]'::jsonb
WHERE template_name = 'Kontorslokal hyra med moms';
