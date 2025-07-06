-- Add new annual/periodic transaction templates for Swedish bookkeeping
INSERT INTO public.airledger_transaction_templates (
  user_id, 
  template_name, 
  description, 
  category, 
  template_entries, 
  is_system_template,
  keywords,
  auto_suggest
) VALUES 
-- 1. Vända årets resultat (Year-end result transfer)
(
  '00000000-0000-0000-0000-000000000000',
  'Vända årets resultat',
  'Överföring av årets resultat till föregående års resultat vid årsskifte',
  'Årsbokslut',
  '[
    {"account_code": "8999", "account_name": "Årets resultat", "type": "debit", "description": "Stäng årets resultat"},
    {"account_code": "2099", "account_name": "Föregående års resultat", "type": "credit", "description": "Överför till föregående års resultat"}
  ]',
  true,
  ARRAY['årsskifte', 'resultat', 'bokslut', 'årets resultat', 'föregående år', 'stänga'],
  true
),

-- 2. Betala moms till skatteverket (VAT payment)
(
  '00000000-0000-0000-0000-000000000000',
  'Betala moms till Skatteverket',
  'Betalning av momsskuld till Skatteverket (förfaller 22:a varje månad)',
  'Moms',
  '[
    {"account_code": "2640", "account_name": "Utgående moms", "type": "debit", "description": "Betala momsskuld"},
    {"account_code": "1930", "account_name": "Checkkonto", "type": "credit", "description": "Betalning från bankkonto"}
  ]',
  true,
  ARRAY['moms', 'skatteverket', 'momsskuld', 'betala', 'utgående moms', '22:a'],
  true
),

-- 3. Bokföra årets resultat till balanserad vinst/förlust
(
  '00000000-0000-0000-0000-000000000000',
  'Balansera årets resultat efter stämma',
  'Överföring av föregående års resultat till balanserad vinst eller förlust efter årsstämma',
  'Årsbokslut',
  '[
    {"account_code": "2099", "account_name": "Föregående års resultat", "type": "debit", "description": "Överför från föregående års resultat"},
    {"account_code": "2098", "account_name": "Balanserad vinst/förlust", "type": "credit", "description": "Balansera till eget kapital"}
  ]',
  true,
  ARRAY['stämma', 'årsstämma', 'balanserad', 'vinst', 'förlust', 'eget kapital', 'resultat'],
  true
),

-- 4. Återbetalning av preliminärskatt
(
  '00000000-0000-0000-0000-000000000000',
  'Återbetalning preliminärskatt',
  'Återbetalning av för mycket betald preliminärskatt från Skatteverket',
  'Skatt',
  '[
    {"account_code": "1930", "account_name": "Checkkonto", "type": "debit", "description": "Erhållen återbetalning"},
    {"account_code": "1630", "account_name": "Preliminärskatt", "type": "credit", "description": "Minska preliminärskattekonto"}
  ]',
  true,
  ARRAY['preliminärskatt', 'återbetalning', 'skatteverket', 'för mycket', 'erhålla', 'tillbaka'],
  true
),

-- 5. Kompletterande skatt
(
  '00000000-0000-0000-0000-000000000000',
  'Betala kompletterande skatt',
  'Betalning av kompletterande skatt vid för lite betald preliminärskatt',
  'Skatt',
  '[
    {"account_code": "8910", "account_name": "Skattekostnad", "type": "debit", "description": "Kompletterande skatt som kostnad"},
    {"account_code": "1930", "account_name": "Checkkonto", "type": "credit", "description": "Betalning till Skatteverket"}
  ]',
  true,
  ARRAY['kompletterande', 'skatt', 'tilläggsdebitering', 'för lite', 'betala', 'skatteverket'],
  true
),

-- 6. Moms deklaration (bokföring av momskuld)
(
  '00000000-0000-0000-0000-000000000000',
  'Moms deklaration - bokföra skuld',
  'Bokföring av momsskuld vid månatlig momsdeklaration',
  'Moms',
  '[
    {"account_code": "2610", "account_name": "Ingående moms", "type": "debit", "description": "Avdragsgill ingående moms"},
    {"account_code": "2640", "account_name": "Utgående moms", "type": "credit", "description": "Utgående moms på försäljning"}
  ]',
  true,
  ARRAY['momsdeklaration', 'deklarera', 'ingående moms', 'utgående moms', 'momsskuld', 'månadsvis'],
  true
),

-- 7. Företagsskatt (slutskatt)
(
  '00000000-0000-0000-0000-000000000000',
  'Företagsskatt - slutskatt',
  'Betalning av företagsskatt (slutskatt) baserat på slutlig deklaration',
  'Skatt',
  '[
    {"account_code": "8910", "account_name": "Skattekostnad", "type": "debit", "description": "Företagsskatt som kostnad"},
    {"account_code": "1930", "account_name": "Checkkonto", "type": "credit", "description": "Betalning av slutskatt"}
  ]',
  true,
  ARRAY['företagsskatt', 'slutskatt', 'deklaration', 'skattekostnad', 'bolagsskatt'],
  true
),

-- 8. Pensionsavgift
(
  '00000000-0000-0000-0000-000000000000',
  'Pensionsavgift företagare',
  'Betalning av pensionsavgift för företagare till Pensionsmyndigheten',
  'Skatt',
  '[
    {"account_code": "8910", "account_name": "Skattekostnad", "type": "debit", "description": "Pensionsavgift som kostnad"},
    {"account_code": "1930", "account_name": "Checkkonto", "type": "credit", "description": "Betalning till Pensionsmyndigheten"}
  ]',
  true,
  ARRAY['pensionsavgift', 'pension', 'företagare', 'pensionsmyndigheten', 'avgift'],
  true
),

-- 9. Bokföra momskuld vid månadsskifte
(
  '00000000-0000-0000-0000-000000000000',
  'Periodisera momskuld',
  'Bokföring av momsskuld vid månadsskifte för att matcha rätt period',
  'Moms',
  '[
    {"account_code": "6110", "account_name": "Lokalhyra", "type": "debit", "description": "Kostnad inkl moms"},
    {"account_code": "2610", "account_name": "Ingående moms", "type": "debit", "description": "Avdragsgill moms"},
    {"account_code": "2440", "account_name": "Leverantörsskulder", "type": "credit", "description": "Skuld till leverantör"}
  ]',
  true,
  ARRAY['periodisera', 'momskuld', 'månadsskifte', 'avräkning', 'skuld', 'leverantör'],
  true
);

-- Update the AI assistant's function definitions to better handle these templates
-- This will be handled in the edge function updates

-- Create index for better performance on template search by keywords and category
CREATE INDEX IF NOT EXISTS idx_templates_category_keywords ON public.airledger_transaction_templates(category, keywords) WHERE is_system_template = true;