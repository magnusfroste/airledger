-- Final batch: Resterande kostnader, personalkostnader och avskrivningar (utan duplikater)

INSERT INTO public.airledger_chart_of_accounts (account_code, account_name, account_type, account_category, normal_balance) VALUES

-- Fortsättning externa kostnader
('5160', 'Marknadsföring', 'expense', 'marketing', 'debit'),
('5170', 'Annonsering', 'expense', 'marketing', 'debit'),
('5180', 'Representation', 'expense', 'marketing', 'debit'),
('5190', 'Övriga externa kostnader', 'expense', 'other_external', 'debit'),
('5200', 'Resekostnader', 'expense', 'travel', 'debit'),
('5210', 'Bilkostnader', 'expense', 'vehicle', 'debit'),
('5220', 'Mil- och traktamenten', 'expense', 'travel', 'debit'),
('5230', 'Måltider på resa', 'expense', 'travel', 'debit'),
('5240', 'Övriga resekostnader', 'expense', 'travel', 'debit'),
('5300', 'Reparation och underhåll av maskiner', 'expense', 'maintenance', 'debit'),
('5310', 'Reparation och underhåll av inventarier', 'expense', 'maintenance', 'debit'),
('5320', 'Reparation och underhåll av datorer', 'expense', 'maintenance', 'debit'),
('5330', 'Reparation och underhåll av bilar', 'expense', 'maintenance', 'debit'),
('5400', 'Konsulttjänster', 'expense', 'professional', 'debit'),
('5410', 'Revision', 'expense', 'professional', 'debit'),
('5420', 'Juridik och rådgivning', 'expense', 'professional', 'debit'),
('5500', 'Försäkringar', 'expense', 'insurance', 'debit'),
('5510', 'Bankavgifter', 'expense', 'financial', 'debit'),
('5520', 'Factoring', 'expense', 'financial', 'debit'),
('5600', 'Förbrukning av verktyg', 'expense', 'tools', 'debit'),
('5610', 'Arbetskläder', 'expense', 'safety', 'debit'),
('5620', 'Skyddsmaterial', 'expense', 'safety', 'debit'),

-- PERSONALKOSTNADER (6000-6999)
('6000', 'Löner', 'expense', 'salaries', 'debit'),
('6010', 'Löner till kollektivanställda', 'expense', 'salaries', 'debit'),
('6020', 'Löner till tjänstemän', 'expense', 'salaries', 'debit'),
('6030', 'Löner till verkställande direktör', 'expense', 'salaries', 'debit'),
('6040', 'Löner till styrelseledamöter', 'expense', 'salaries', 'debit'),
('6050', 'Tillfälliga löner', 'expense', 'salaries', 'debit'),
('6060', 'Övertidsersättning', 'expense', 'salaries', 'debit'),
('6070', 'Bonusar och gratifikationer', 'expense', 'salaries', 'debit'),
('6080', 'Semesterersättning', 'expense', 'salaries', 'debit'),
('6090', 'Övriga lönekostnader', 'expense', 'salaries', 'debit'),
('6110', 'Socialavgifter enligt lag', 'expense', 'social_costs', 'debit'),
('6210', 'Övriga sociala kostnader', 'expense', 'social_costs', 'debit'),
('6220', 'Pensionsförsäkringspremier', 'expense', 'pension', 'debit'),
('6230', 'Sjukförsäkringspremier', 'expense', 'social_costs', 'debit'),
('6240', 'Övriga personalförsäkringar', 'expense', 'social_costs', 'debit'),
('6250', 'Personalutbildning', 'expense', 'training', 'debit'),
('6260', 'Personalvård', 'expense', 'employee_benefits', 'debit'),

-- AVSKRIVNINGAR OCH NEDSKRIVNINGAR (7000-7799)
('7000', 'Avskrivningar på immateriella tillgångar', 'expense', 'depreciation', 'debit'),
('7010', 'Avskrivningar på byggnader', 'expense', 'depreciation', 'debit'),
('7020', 'Avskrivningar på maskiner', 'expense', 'depreciation', 'debit'),
('7030', 'Avskrivningar på inventarier', 'expense', 'depreciation', 'debit'),
('7040', 'Avskrivningar på bilar', 'expense', 'depreciation', 'debit'),
('7050', 'Avskrivningar på datorer', 'expense', 'depreciation', 'debit'),
('7060', 'Avskrivningar på installationer', 'expense', 'depreciation', 'debit'),
('7070', 'Avskrivningar på övriga materiella tillgångar', 'expense', 'depreciation', 'debit'),
('7100', 'Nedskrivningar av immateriella tillgångar', 'expense', 'impairment', 'debit'),
('7110', 'Nedskrivningar av byggnader', 'expense', 'impairment', 'debit'),
('7120', 'Nedskrivningar av maskiner', 'expense', 'impairment', 'debit'),
('7130', 'Nedskrivningar av inventarier', 'expense', 'impairment', 'debit'),
('7140', 'Nedskrivningar av bilar', 'expense', 'impairment', 'debit'),
('7150', 'Nedskrivningar av finansiella tillgångar', 'expense', 'impairment', 'debit'),

-- ÖVRIGA RÖRELSEKOSTNADER (7800-7999)
('7800', 'Förlust vid avyttring av materiella tillgångar', 'expense', 'asset_disposal', 'debit'),
('7810', 'Förlust vid avyttring av finansiella tillgångar', 'expense', 'financial_disposal', 'debit'),
('7820', 'Valutakursförluster', 'expense', 'currency', 'debit'),
('7890', 'Övriga rörelsekostnader', 'expense', 'other_operating', 'debit'),

-- FINANSIELLA INTÄKTER OCH KOSTNADER (8000-8999)
('8000', 'Ränteintäkter', 'income', 'interest', 'credit'),
('8010', 'Räntekostnader till kreditinstitut', 'expense', 'interest', 'debit'),
('8020', 'Räntekostnader på banklån', 'expense', 'interest', 'debit'),
('8030', 'Räntekostnader till koncernföretag', 'expense', 'interest', 'debit'),
('8040', 'Räntekostnader till intresseföretag', 'expense', 'interest', 'debit'),
('8050', 'Övriga räntekostnader', 'expense', 'interest', 'debit'),
('8060', 'Kursvinster', 'income', 'currency', 'credit'),
('8070', 'Kursförluster', 'expense', 'currency', 'debit'),

-- EXTRAORDINÄRA POSTER (9000-9999)
('9000', 'Extraordinära intäkter', 'income', 'extraordinary', 'credit'),
('9010', 'Extraordinära kostnader', 'expense', 'extraordinary', 'debit'),

-- BOKSLUTSDISPOSITIONER (8800-8899)
('8800', 'Förändring av överavskrivningar', 'expense', 'tax_adjustments', 'debit'),
('8810', 'Förändring av periodiseringsfonder', 'expense', 'tax_adjustments', 'debit'),
('8820', 'Lämnade koncernbidrag', 'expense', 'group_contributions', 'debit'),
('8830', 'Erhållna koncernbidrag', 'income', 'group_contributions', 'credit'),

-- SKATTER (8900-8999)
('8900', 'Skatt på årets resultat', 'expense', 'tax', 'debit'),
('8910', 'Uppskjuten skatt', 'expense', 'deferred_tax', 'debit'),
('8920', 'Förändring av uppskjuten skatt', 'expense', 'deferred_tax', 'debit');