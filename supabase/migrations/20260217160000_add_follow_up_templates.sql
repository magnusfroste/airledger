-- Add follow_up_templates to templates that are missing them
-- This enables the AI to suggest related bookings after a transaction

-- Lön utbetalning → Arbetsgivaravgifter
UPDATE airledger_transaction_templates
SET follow_up_templates = ARRAY['Arbetsgivaravgifter']
WHERE template_name = 'Lön utbetalning'
  AND (follow_up_templates IS NULL OR follow_up_templates = '{}');

-- Arbetsgivaravgifter → F-skatt inbetalning
UPDATE airledger_transaction_templates
SET follow_up_templates = ARRAY['F-skatt inbetalning']
WHERE template_name = 'Arbetsgivaravgifter'
  AND (follow_up_templates IS NULL OR follow_up_templates = '{}');

-- Tjänsteresa tåg/flyg → Hotell tjänsteresa
UPDATE airledger_transaction_templates
SET follow_up_templates = ARRAY['Hotell tjänsteresa']
WHERE template_name = 'Tjänsteresa tåg/flyg'
  AND (follow_up_templates IS NULL OR follow_up_templates = '{}');
