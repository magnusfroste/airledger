-- Standardisera mallstruktur för alla systemmallar
-- Först, ta bort dubletten av Löneutbetalning (behåll den med rätt kontostruktur)
DELETE FROM airledger_transaction_templates 
WHERE id = '16abd0ce-0e34-4095-bfa8-d7eb97cadce2' AND template_name = 'Löneutbetalning';

-- Standardisera kategorier till svenska
UPDATE airledger_transaction_templates SET category = 'Försäkringar' WHERE category = 'insurance';
UPDATE airledger_transaction_templates SET category = 'Övrigt' WHERE category = 'rent';
UPDATE airledger_transaction_templates SET category = 'Lön och personal' WHERE category = 'salary';
UPDATE airledger_transaction_templates SET category = 'Skatter och avgifter' WHERE category = 'Skatt';

-- Fixa problematiska Preliminärskatt mallen - förenkla strukturen
UPDATE airledger_transaction_templates 
SET template_entries = '[
  {
    "account_code": "1630",
    "account_name": "Avräkning för skatter och avgifter", 
    "description": "Betalning preliminärskatt",
    "type": "debit"
  },
  {
    "account_code": "1930",
    "account_name": "Företagskonto/affärskonto",
    "description": "Betalning via bank", 
    "type": "credit"
  }
]'::jsonb,
description = 'Månadsvis betalning av preliminärskatt till Skatteverket',
keywords = ARRAY['preliminärskatt', 'skatt', 'skatteverket', 'månatlig', 'betalning']
WHERE template_name = 'Preliminärskatt';

-- Uppdatera Kontorsmaterial till standardstruktur (ta bort vat_calculation)
UPDATE airledger_transaction_templates
SET template_entries = '[
  {
    "account_code": "6110",
    "account_name": "Kontorsmaterial",
    "description": "Kontorsmaterial exkl moms",
    "type": "debit"
  },
  {
    "account_code": "2640", 
    "account_name": "Ingående moms",
    "description": "Moms på material 25%",
    "type": "debit"
  },
  {
    "account_code": "1930",
    "account_name": "Företagskonto/affärskonto", 
    "description": "Betalning material",
    "type": "credit"
  }
]'::jsonb,
description = 'Inköp av kontorsmaterial som papper, pennor, skrivare etc. med 25% moms'
WHERE template_name = 'Kontorsmaterial';

-- Förbättra keywords för bättre AI-matchning
UPDATE airledger_transaction_templates 
SET keywords = ARRAY['lön', 'löner', 'anställd', 'personal', 'nettolön', 'månadslön', 'utbetalning']
WHERE template_name = 'Löneutbetalning';

UPDATE airledger_transaction_templates
SET keywords = ARRAY['hyra', 'lokalhyra', 'kontor', 'lokal', 'månatlig', 'fastighet']  
WHERE template_name = 'Lokalhyra';

UPDATE airledger_transaction_templates
SET keywords = ARRAY['försäkring', 'företagsförsäkring', 'premie', 'allmän', 'månadsvis']
WHERE template_name = 'Försäkringar';

UPDATE airledger_transaction_templates
SET keywords = ARRAY['moms', 'momsredovisning', 'skatteverket', 'utgående', 'ingående', 'kvartalsvis', 'månatlig', 'deklaration']
WHERE template_name = 'Momsredovisning';

-- Lägg till keywords där de saknas
UPDATE airledger_transaction_templates 
SET keywords = ARRAY['arbetsgivaravgifter', 'avgifter', 'skatteverket', 'personalavgifter', 'månatlig']
WHERE template_name = 'Arbetsgivaravgifter';

UPDATE airledger_transaction_templates
SET keywords = ARRAY['bankavgifter', 'bankkostnad', 'avgift', 'månatlig', 'konto']
WHERE template_name = 'Bankavgifter';

UPDATE airledger_transaction_templates
SET keywords = ARRAY['semesterersättning', 'semester', 'intjänad', 'personal', 'utbetalning']  
WHERE template_name = 'Semesterersättning';

-- Förbättra beskrivningar för AI-optimering
UPDATE airledger_transaction_templates
SET description = 'Månadsvis löneutbetalning till anställd (nettolön efter skatt och avgifter)'
WHERE template_name = 'Löneutbetalning';

UPDATE airledger_transaction_templates  
SET description = 'Månadsvis hyra för kontorslokaler och affärslokaler'
WHERE template_name = 'Lokalhyra';

UPDATE airledger_transaction_templates
SET description = 'Allmänna företagsförsäkringar som ansvarsförsäkring'
WHERE template_name = 'Försäkringar Allmän';

UPDATE airledger_transaction_templates
SET description = 'Kvartalsvis eller månatlig momsredovisning till Skatteverket'  
WHERE template_name = 'Momsredovisning';