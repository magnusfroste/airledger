-- Lägg till vanliga svenska konteringsmallar
INSERT INTO public.airledger_transaction_templates (
  user_id,
  template_name,
  description,
  category,
  keywords,
  template_entries,
  is_system_template,
  is_recurring
) VALUES 
-- Kommunikation och telefoni
(
  '00000000-0000-0000-0000-000000000000',
  'Mobiltelefon/Telefoni',
  'Månadsvis kostnad för mobiltelefon och telefoni',
  'Kontorskostnader',
  ARRAY['telefon', 'mobil', 'tele', 'kommunikation', 'abonnemang'],
  '[
    {"account_code": "6212", "account_name": "Tele och post", "type": "debit", "description": "Telefonkostnad"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "description": "Moms på telefon 25%"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning telefon"}
  ]'::jsonb,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  'Internetabonnemang',
  'Månadsvis kostnad för internetuppkoppling',
  'Kontorskostnader',
  ARRAY['internet', 'bredband', 'uppkoppling', 'nät'],
  '[
    {"account_code": "6212", "account_name": "Tele och post", "type": "debit", "description": "Internetkostnad"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "description": "Moms på internet 25%"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning internet"}
  ]'::jsonb,
  true,
  true
),

-- Kontorsmaterial och utrustning
(
  '00000000-0000-0000-0000-000000000000',
  'Kontorsmaterial',
  'Inköp av kontorsmaterial som papper, pennor, etc',
  'Kontorskostnader',
  ARRAY['kontorsmaterial', 'papper', 'pennor', 'material', 'utrustning'],
  '[
    {"account_code": "6110", "account_name": "Kontorsmaterial", "type": "debit", "description": "Kontorsmaterial"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "description": "Moms på material 25%"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning material"}
  ]'::jsonb,
  true,
  false
),

-- Representation
(
  '00000000-0000-0000-0000-000000000000',
  'Representation - Avdragsgill',
  'Representation som är avdragsgill (50% av kostnaden)',
  'Övrigt',
  ARRAY['representation', 'lunch', 'middag', 'kund', 'möte'],
  '[
    {"account_code": "6420", "account_name": "Representation, avdragsgill del", "type": "debit", "description": "Representation (50% av kostnad)"},
    {"account_code": "6421", "account_name": "Representation, ej avdragsgill del", "type": "debit", "description": "Representation (50% av kostnad)"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "description": "Moms på representation"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning representation"}
  ]'::jsonb,
  true,
  false
),

-- Bank och finansiellt
(
  '00000000-0000-0000-0000-000000000000',
  'Bankavgifter',
  'Avgifter från banken för kontotjänster',
  'Skatter och avgifter',
  ARRAY['bank', 'avgift', 'kostnad', 'bankkostnad'],
  '[
    {"account_code": "6570", "account_name": "Bankkostnader", "type": "debit", "description": "Bankavgifter"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Bankavgift"}
  ]'::jsonb,
  true,
  false
),

-- Fordonskostnader
(
  '00000000-0000-0000-0000-000000000000',
  'Drivmedel/Bensin',
  'Inköp av drivmedel för företagsfordon',
  'Fordonskostnader',
  ARRAY['bensin', 'diesel', 'drivmedel', 'bränsle', 'tankning'],
  '[
    {"account_code": "5410", "account_name": "Förbrukningsinventarier", "type": "debit", "description": "Drivmedel"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "description": "Moms på drivmedel 25%"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning drivmedel"}
  ]'::jsonb,
  true,
  false
),
(
  '00000000-0000-0000-0000-000000000000',
  'Bilförsäkring',
  'Årlig eller månadsvis bilförsäkring för företagsfordon',
  'Försäkringar',
  ARRAY['bilförsäkring', 'försäkring', 'bil', 'fordon'],
  '[
    {"account_code": "5420", "account_name": "Förbrukningsinventarier", "type": "debit", "description": "Bilförsäkring"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning försäkring"}
  ]'::jsonb,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  'Bilservice/Reparation',
  'Service och reparation av företagsfordon',
  'Fordonskostnader',
  ARRAY['service', 'reparation', 'bil', 'verkstad', 'underhåll'],
  '[
    {"account_code": "5460", "account_name": "Förbrukningsmaterial", "type": "debit", "description": "Bilservice/reparation"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "description": "Moms på service 25%"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning service"}
  ]'::jsonb,
  true,
  false
),
(
  '00000000-0000-0000-0000-000000000000',
  'Parkeringsavgifter',
  'Parkeringsavgifter vid kundbesök och resor',
  'Fordonskostnader',
  ARRAY['parkering', 'parkeringsavgift', 'biljettkostnad'],
  '[
    {"account_code": "6250", "account_name": "Biljetter och resor", "type": "debit", "description": "Parkeringsavgifter"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning parkering"}
  ]'::jsonb,
  true,
  false
),

-- Lön och personal (för företag med anställda)
(
  '00000000-0000-0000-0000-000000000000',
  'Löneutbetalning',
  'Månadslön till anställd (nettolön efter skatt)',
  'Lön och personal',
  ARRAY['lön', 'löner', 'anställd', 'personal', 'nettolön'],
  '[
    {"account_code": "7010", "account_name": "Löner", "type": "debit", "description": "Bruttolön"},
    {"account_code": "2710", "account_name": "Personalskatter", "type": "credit", "description": "Preliminärskatt och avgifter"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Nettolön till anställd"}
  ]'::jsonb,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  'Arbetsgivaravgifter',
  'Månatliga arbetsgivaravgifter till Skatteverket',
  'Lön och personal',
  ARRAY['arbetsgivaravgifter', 'avgifter', 'skatteverket', 'personalavgifter'],
  '[
    {"account_code": "7510", "account_name": "Arbetsgivaravgifter", "type": "debit", "description": "Arbetsgivaravgifter"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning arbetsgivaravgifter"}
  ]'::jsonb,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  'Semesterersättning',
  'Utbetalning av intjänad semesterersättning',
  'Lön och personal',
  ARRAY['semester', 'semesterersättning', 'intjänad', 'personal'],
  '[
    {"account_code": "7016", "account_name": "Semesterersättning", "type": "debit", "description": "Semesterersättning"},
    {"account_code": "2720", "account_name": "Upplupna löner", "type": "credit", "description": "Tidigare avsättning"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Utbetalning semester"}
  ]'::jsonb,
  true,
  false
),

-- Moms och skatter
(
  '00000000-0000-0000-0000-000000000000',
  'Momsredovisning',
  'Månatlig eller kvartalsvis momsredovisning',
  'Skatter och avgifter',
  ARRAY['moms', 'momsredovisning', 'skatteverket', 'utgående', 'ingående'],
  '[
    {"account_code": "2610", "account_name": "Utgående moms", "type": "debit", "description": "Utgående moms från försäljning"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "credit", "description": "Ingående moms från inköp"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Netto momsbetalning"}
  ]'::jsonb,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  'F-skatt betalning',
  'Betalning av preliminärskatt (F-skatt)',
  'Skatter och avgifter',
  ARRAY['f-skatt', 'preliminärskatt', 'skatt', 'skatteverket'],
  '[
    {"account_code": "2518", "account_name": "Övriga skatteskulder", "type": "debit", "description": "F-skatt"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning F-skatt"}
  ]'::jsonb,
  true,
  false
),

-- Övrigt
(
  '00000000-0000-0000-0000-000000000000',
  'Försäkringar Allmän',
  'Allmänna företagsförsäkringar',
  'Försäkringar',
  ARRAY['försäkring', 'företagsförsäkring', 'ansvarsförsäkring'],
  '[
    {"account_code": "6311", "account_name": "Övriga lokalutgifter", "type": "debit", "description": "Företagsförsäkring"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning försäkring"}
  ]'::jsonb,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  'Programvara/Licenser',
  'Månadsvis kostnad för programvara och licenser',
  'Kontorskostnader',
  ARRAY['programvara', 'licens', 'software', 'abonnemang', 'saas'],
  '[
    {"account_code": "6110", "account_name": "Kontorsmaterial", "type": "debit", "description": "Programvarulicens"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "description": "Moms på programvara 25%"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning licens"}
  ]'::jsonb,
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  'Marknadsföring',
  'Kostnader för marknadsföring och reklam',
  'Övrigt',
  ARRAY['marknadsföring', 'reklam', 'annonsering', 'marketing'],
  '[
    {"account_code": "6110", "account_name": "Kontorsmaterial", "type": "debit", "description": "Marknadsföringskostnad"},
    {"account_code": "2640", "account_name": "Ingående moms", "type": "debit", "description": "Moms på marknadsföring 25%"},
    {"account_code": "1930", "account_name": "Företagskonto/checkräkningskonto", "type": "credit", "description": "Betalning marknadsföring"}
  ]'::jsonb,
  true,
  false
);