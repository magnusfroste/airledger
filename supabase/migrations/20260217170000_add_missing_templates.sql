-- Lägg till saknade bokföringsmallar för småföretag
-- Dessa mallar täcker vanliga transaktioner som saknades

-- ============================================
-- FÖRSÄLJNING
-- ============================================

-- Försäljning varor 25% moms
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries, follow_up_templates
) VALUES (
  'Försäljning varor 25%',
  'Försäljning av varor med 25% moms',
  'Försäljning',
  true,
  ARRAY['försäljning', 'varor', 'produkter', 'sälj', 'faktura', 'vara'],
  '[
    {"account_code": "1510", "account_name": "Kundfordringar", "type": "debit"},
    {"account_code": "3001", "account_name": "Försäljning varor inom Sverige, 25% moms", "type": "credit"},
    {"account_code": "2610", "account_name": "Utgående moms, 25%", "type": "credit"}
  ]'::jsonb,
  ARRAY['Kundbetalning inkommande']
) ON CONFLICT (template_name) DO NOTHING;

-- Försäljning varor 12% moms (livsmedel, hotell)
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries, follow_up_templates
) VALUES (
  'Försäljning varor 12%',
  'Försäljning av livsmedel och restaurangtjänster med 12% moms',
  'Försäljning',
  true,
  ARRAY['försäljning', 'livsmedel', 'mat', 'restaurang', 'catering', '12%'],
  '[
    {"account_code": "1510", "account_name": "Kundfordringar", "type": "debit"},
    {"account_code": "3002", "account_name": "Försäljning varor inom Sverige, 12% moms", "type": "credit"},
    {"account_code": "2620", "account_name": "Utgående moms, 12%", "type": "credit"}
  ]'::jsonb,
  ARRAY['Kundbetalning inkommande']
) ON CONFLICT (template_name) DO NOTHING;

-- Försäljning varor 6% moms (böcker, tidningar)
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries, follow_up_templates
) VALUES (
  'Försäljning varor 6%',
  'Försäljning av böcker, tidningar med 6% moms',
  'Försäljning',
  true,
  ARRAY['försäljning', 'böcker', 'tidningar', 'kultur', '6%'],
  '[
    {"account_code": "1510", "account_name": "Kundfordringar", "type": "debit"},
    {"account_code": "3003", "account_name": "Försäljning varor inom Sverige, 6% moms", "type": "credit"},
    {"account_code": "2630", "account_name": "Utgående moms, 6%", "type": "credit"}
  ]'::jsonb,
  ARRAY['Kundbetalning inkommande']
) ON CONFLICT (template_name) DO NOTHING;

-- Försäljning momsfri (export, sjukvård)
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries, follow_up_templates
) VALUES (
  'Försäljning momsfri',
  'Momsfri försäljning (export, sjukvård, utbildning)',
  'Försäljning',
  true,
  ARRAY['försäljning', 'export', 'momsfri', 'utland', 'sjukvård', 'utbildning'],
  '[
    {"account_code": "1510", "account_name": "Kundfordringar", "type": "debit"},
    {"account_code": "3004", "account_name": "Försäljning momsfri", "type": "credit"}
  ]'::jsonb,
  ARRAY['Kundbetalning inkommande']
) ON CONFLICT (template_name) DO NOTHING;

-- ============================================
-- LEVERANTÖRER
-- ============================================

-- Leverantörsfaktura
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries, follow_up_templates
) VALUES (
  'Leverantörsfaktura',
  'Inköp från leverantör på kredit',
  'Inköp',
  true,
  ARRAY['leverantör', 'faktura', 'inköp', 'kredit', 'skuld', 'leverantörsfaktura'],
  '[
    {"account_code": "4010", "account_name": "Inköp varor och material", "type": "debit"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit"},
    {"account_code": "2440", "account_name": "Leverantörsskulder", "type": "credit"}
  ]'::jsonb,
  ARRAY['Leverantörsbetalning']
) ON CONFLICT (template_name) DO NOTHING;

-- Leverantörsbetalning
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Leverantörsbetalning',
  'Betalning av leverantörsskuld',
  'Inköp',
  true,
  ARRAY['leverantör', 'betalning', 'betala', 'skuld', 'leverantörsskuld'],
  '[
    {"account_code": "2440", "account_name": "Leverantörsskulder", "type": "debit"},
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- ============================================
-- PERSONAL OCH UTLÄGG
-- ============================================

-- Utlägg anställd
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Utlägg anställd',
  'Ersättning för utlägg som anställd gjort',
  'Lön och personal',
  true,
  ARRAY['utlägg', 'ersättning', 'anställd', 'kvitto', 'återbetalning'],
  '[
    {"account_code": "6991", "account_name": "Övriga externa kostnader", "type": "debit"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit"},
    {"account_code": "2820", "account_name": "Kortfristiga skulder till anställda", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Milersättning
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Milersättning',
  'Bilersättning för tjänsteresa med egen bil',
  'Lön och personal',
  true,
  ARRAY['milersättning', 'bilersättning', 'tjänsteresa', 'bil', 'körning', 'mil'],
  '[
    {"account_code": "7331", "account_name": "Bilersättningar", "type": "debit"},
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Traktamente
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Traktamente',
  'Dagtraktamente för tjänsteresa',
  'Lön och personal',
  true,
  ARRAY['traktamente', 'dagtraktamente', 'tjänsteresa', 'resa', 'övernattning'],
  '[
    {"account_code": "7321", "account_name": "Skattefria traktamenten, Sverige", "type": "debit"},
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- ============================================
-- ÄGARTRANSAKTIONER
-- ============================================

-- Aktieutdelning
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Aktieutdelning',
  'Utdelning till aktieägare',
  'Eget kapital',
  true,
  ARRAY['utdelning', 'aktieutdelning', 'ägare', 'aktieägare', 'vinst'],
  '[
    {"account_code": "2091", "account_name": "Balanserad vinst eller förlust", "type": "debit"},
    {"account_code": "2898", "account_name": "Outtagen vinstutdelning", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Utbetalning utdelning
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Utbetalning utdelning',
  'Utbetalning av beslutad utdelning till ägare',
  'Eget kapital',
  true,
  ARRAY['utdelning', 'utbetalning', 'ägare', 'aktieägare'],
  '[
    {"account_code": "2898", "account_name": "Outtagen vinstutdelning", "type": "debit"},
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- ============================================
-- FINANSIELLA TRANSAKTIONER
-- ============================================

-- Ränteintäkt
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Ränteintäkt',
  'Ränta på bankkonto eller placeringar',
  'Finansiellt',
  true,
  ARRAY['ränta', 'ränteintäkt', 'bank', 'sparande', 'avkastning'],
  '[
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "debit"},
    {"account_code": "8310", "account_name": "Ränteintäkter", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Räntekostnad
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Räntekostnad',
  'Ränta på lån eller kredit',
  'Finansiellt',
  true,
  ARRAY['ränta', 'räntekostnad', 'lån', 'kredit', 'bank'],
  '[
    {"account_code": "8410", "account_name": "Räntekostnader", "type": "debit"},
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Banklån upptagande
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries, follow_up_templates
) VALUES (
  'Banklån upptagande',
  'Upptagande av nytt banklån',
  'Finansiellt',
  true,
  ARRAY['lån', 'banklån', 'kredit', 'finansiering', 'upptagande'],
  '[
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "debit"},
    {"account_code": "2350", "account_name": "Skulder till kreditinstitut", "type": "credit"}
  ]'::jsonb,
  ARRAY['Amortering banklån']
) ON CONFLICT (template_name) DO NOTHING;

-- Amortering banklån
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Amortering banklån',
  'Amortering på banklån',
  'Finansiellt',
  true,
  ARRAY['amortering', 'lån', 'banklån', 'avbetalning'],
  '[
    {"account_code": "2350", "account_name": "Skulder till kreditinstitut", "type": "debit"},
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- ============================================
-- BETALNINGSMETODER
-- ============================================

-- Swish-inbetalning
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Swish-inbetalning',
  'Inbetalning via Swish från kund',
  'Försäljning',
  true,
  ARRAY['swish', 'inbetalning', 'betalning', 'kund', 'mobil'],
  '[
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "debit"},
    {"account_code": "1510", "account_name": "Kundfordringar", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Kortbetalning (försäljning)
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Kortbetalning försäljning',
  'Försäljning betald med kort',
  'Försäljning',
  true,
  ARRAY['kort', 'kortbetalning', 'visa', 'mastercard', 'försäljning'],
  '[
    {"account_code": "1580", "account_name": "Fordran kortinlösen", "type": "debit"},
    {"account_code": "3001", "account_name": "Försäljning inom Sverige, 25% moms", "type": "credit"},
    {"account_code": "2610", "account_name": "Utgående moms, 25%", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- ============================================
-- BOKSLUT (komplettering)
-- ============================================

-- Förutbetalda kostnader
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Förutbetalda kostnader',
  'Periodisering av förutbetalda kostnader vid bokslut',
  'Bokslut',
  true,
  ARRAY['förutbetald', 'periodisering', 'bokslut', 'kostnad'],
  '[
    {"account_code": "1710", "account_name": "Förutbetalda kostnader", "type": "debit"},
    {"account_code": "6990", "account_name": "Övriga externa kostnader", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Upplupna intäkter
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Upplupna intäkter',
  'Periodisering av upplupna intäkter vid bokslut',
  'Bokslut',
  true,
  ARRAY['upplupen', 'intäkt', 'periodisering', 'bokslut'],
  '[
    {"account_code": "1790", "account_name": "Övriga förutbetalda kostnader och upplupna intäkter", "type": "debit"},
    {"account_code": "3999", "account_name": "Övriga rörelseintäkter", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Förutbetalda intäkter
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Förutbetalda intäkter',
  'Förskottsbetalning från kund som ska intäktsföras senare',
  'Bokslut',
  true,
  ARRAY['förskott', 'förutbetald', 'intäkt', 'periodisering'],
  '[
    {"account_code": "1930", "account_name": "Företagskonto/affärskonto", "type": "debit"},
    {"account_code": "2990", "account_name": "Övriga kortfristiga skulder", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Avskrivning inventarier
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Avskrivning inventarier',
  'Årlig avskrivning på inventarier och möbler',
  'Bokslut',
  true,
  ARRAY['avskrivning', 'inventarier', 'möbler', 'inredning', 'bokslut'],
  '[
    {"account_code": "7832", "account_name": "Avskrivningar inventarier", "type": "debit"},
    {"account_code": "1229", "account_name": "Ackumulerade avskrivningar inventarier", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Avskrivning bilar
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Avskrivning bilar',
  'Årlig avskrivning på tjänstebilar',
  'Bokslut',
  true,
  ARRAY['avskrivning', 'bil', 'bilar', 'fordon', 'tjänstebil', 'bokslut'],
  '[
    {"account_code": "7834", "account_name": "Avskrivningar bilar", "type": "debit"},
    {"account_code": "1249", "account_name": "Ackumulerade avskrivningar bilar", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Resultatdisposition
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Resultatdisposition',
  'Överföring av årets resultat till balanserat resultat',
  'Bokslut',
  true,
  ARRAY['resultat', 'disposition', 'balanserat', 'bokslut', 'årsredovisning'],
  '[
    {"account_code": "8999", "account_name": "Årets resultat", "type": "debit"},
    {"account_code": "2091", "account_name": "Balanserad vinst eller förlust", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- ============================================
-- ÖVRIGT
-- ============================================

-- Dröjsmålsränta (intäkt)
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Dröjsmålsränta intäkt',
  'Dröjsmålsränta på försenad kundbetalning',
  'Finansiellt',
  true,
  ARRAY['dröjsmålsränta', 'ränta', 'försenad', 'betalning', 'kund'],
  '[
    {"account_code": "1510", "account_name": "Kundfordringar", "type": "debit"},
    {"account_code": "8313", "account_name": "Ränteintäkter från kortfristiga fordringar", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Inkassokrav
INSERT INTO airledger_transaction_templates (
  template_name, description, category, is_system_template, keywords,
  template_entries
) VALUES (
  'Inkassokrav',
  'Inkassokostnad som debiteras kund',
  'Finansiellt',
  true,
  ARRAY['inkasso', 'krav', 'indrivning', 'försenad', 'betalning'],
  '[
    {"account_code": "1510", "account_name": "Kundfordringar", "type": "debit"},
    {"account_code": "3990", "account_name": "Övriga ersättningar och intäkter", "type": "credit"}
  ]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;
