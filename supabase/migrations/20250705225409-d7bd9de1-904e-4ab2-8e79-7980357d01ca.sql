-- FORTSÄTTNING: Kortfristiga skulder (24xx) och intäkter/kostnader (3xxx-8xxx)
INSERT INTO public.airledger_chart_of_accounts (account_code, account_name, account_type, account_category, normal_balance) VALUES

-- 24xx - Kortfristiga skulder
('2410', 'Banklån', 'liability', 'short_term_debt', 'credit'),
('2411', 'Banklån inom koncernen', 'liability', 'short_term_debt', 'credit'),
('2412', 'Banklån hos intresseföretag', 'liability', 'short_term_debt', 'credit'),
('2420', 'Övriga kortfristiga skulder till kreditinstitut', 'liability', 'short_term_debt', 'credit'),
('2440', 'Leverantörsskulder', 'liability', 'payables', 'credit'),
('2441', 'Leverantörsskulder inom koncernen', 'liability', 'payables', 'credit'),
('2442', 'Leverantörsskulder hos intresseföretag', 'liability', 'payables', 'credit'),
('2450', 'Växelskulder', 'liability', 'payables', 'credit'),
('2460', 'Skatteskulder', 'liability', 'payables', 'credit'),
('2470', 'Personalens källskatt', 'liability', 'payables', 'credit'),
('2480', 'Övriga kortfristiga skulder', 'liability', 'payables', 'credit'),
('2490', 'Upplupna kostnader och förutbetalda intäkter', 'liability', 'payables', 'credit'),

-- INTÄKTER (3000-3999) - Korrekta namn från BAS 2024
('3000', 'Försäljning inom Sverige', 'income', 'sales', 'credit'),
('3001', 'Försäljning inom koncernen', 'income', 'sales', 'credit'),
('3002', 'Försäljning till intresseföretag', 'income', 'sales', 'credit'),
('3010', 'Försäljning av tjänster', 'income', 'services', 'credit'),
('3040', 'Hyresintäkter', 'income', 'rental', 'credit'),
('3050', 'Provisionsintäkter', 'income', 'commission', 'credit'),
('3060', 'Licensintäkter', 'income', 'license', 'credit'),
('3070', 'Fakturerade frakter', 'income', 'freight', 'credit'),
('3080', 'Valutakursvinster', 'income', 'currency', 'credit'),
('3090', 'Övriga rörelseintäkter', 'income', 'other_operating', 'credit'),

-- KOSTNADER FÖR SÅLDA VAROR (4000-4999) - Korrekta namn
('4000', 'Inköp av varor från Sverige', 'expense', 'cost_of_goods', 'debit'),
('4001', 'Inköp av varor inom koncernen', 'expense', 'cost_of_goods', 'debit'),
('4002', 'Inköp av varor från intresseföretag', 'expense', 'cost_of_goods', 'debit'),
('4010', 'Inköp av material', 'expense', 'cost_of_goods', 'debit'),
('4020', 'Inköp av underentreprenader', 'expense', 'cost_of_goods', 'debit'),
('4030', 'Indirekt material', 'expense', 'cost_of_goods', 'debit'),
('4040', 'Förpackningsmaterial', 'expense', 'cost_of_goods', 'debit'),
('4050', 'Frakter', 'expense', 'cost_of_goods', 'debit'),
('4060', 'Tullar och avgifter', 'expense', 'cost_of_goods', 'debit'),
('4070', 'Lagersvinn', 'expense', 'cost_of_goods', 'debit'),
('4080', 'Valutakursförluster på rörelse', 'expense', 'cost_of_goods', 'debit'),
('4090', 'Övriga kostnader för sålda varor', 'expense', 'cost_of_goods', 'debit'),

-- LOKALKOSTNADER (5000-5999) - Korrekta namn från BAS 2024
('5000', 'Lokalkostnader (gruppkonto)', 'expense', 'premises', 'debit'),
('5010', 'Lokalhyra', 'expense', 'premises', 'debit'),
('5020', 'El för belysning', 'expense', 'utilities', 'debit'),
('5030', 'Värme', 'expense', 'utilities', 'debit'),
('5040', 'Vatten och avlopp', 'expense', 'utilities', 'debit'),
('5050', 'Lokaltillbehör', 'expense', 'premises', 'debit'),
('5060', 'Städning och renhållning', 'expense', 'premises', 'debit'),
('5070', 'Reparation och underhåll av lokaler', 'expense', 'maintenance', 'debit'),
('5090', 'Övriga lokalkostnader', 'expense', 'premises', 'debit'),

-- KONTORSMATERIAL (6000-6999) - Korrekta namn från BAS 2024
('6000', 'Övriga försäljningskostnader (gruppkonto)', 'expense', 'sales_costs', 'debit'),
('6010', 'Kataloger, prislistor m.m.', 'expense', 'sales_costs', 'debit'),
('6020', 'Egna facktidskrifter', 'expense', 'sales_costs', 'debit'),
('6030', 'Speciella orderkostnader', 'expense', 'sales_costs', 'debit'),
('6040', 'Kontokortsavgifter', 'expense', 'sales_costs', 'debit'),
('6050', 'Försäljningsprovisioner', 'expense', 'sales_costs', 'debit'),
('6060', 'Kreditförsäljningskostnader', 'expense', 'sales_costs', 'debit'),
('6070', 'Representation', 'expense', 'sales_costs', 'debit'),
('6080', 'Bankgarantier', 'expense', 'sales_costs', 'debit'),
('6090', 'Övriga försäljningskostnader', 'expense', 'sales_costs', 'debit'),
('6100', 'Kontorsmateriel och trycksaker (gruppkonto)', 'expense', 'office', 'debit'),
('6110', 'Kontorsmateriel', 'expense', 'office', 'debit'),
('6150', 'Trycksaker', 'expense', 'office', 'debit'),
('6200', 'Tele och post (gruppkonto)', 'expense', 'communication', 'debit'),
('6210', 'Telekommunikation', 'expense', 'communication', 'debit'),
('6230', 'Datakommunikation', 'expense', 'communication', 'debit'),
('6250', 'Postbefordran', 'expense', 'communication', 'debit'),

-- PERSONALKOSTNADER (7000-7999) - Korrekta namn från BAS 2024
('7000', 'Löner till kollektivanställda (gruppkonto)', 'expense', 'salaries', 'debit'),
('7010', 'Löner till kollektivanställda', 'expense', 'salaries', 'debit'),
('7020', 'Löner till tjänstemän', 'expense', 'salaries', 'debit'),
('7030', 'Löner till verkställande direktör', 'expense', 'salaries', 'debit'),
('7080', 'Arvoden styrelse och revisorer', 'expense', 'fees', 'debit'),
('7090', 'Övriga ersättningar', 'expense', 'compensation', 'debit'),
('7210', 'Socialavgifter enligt lag', 'expense', 'social_costs', 'debit'),
('7220', 'Avgifter för tjänstepension', 'expense', 'pension', 'debit'),
('7230', 'Övriga sociala kostnader', 'expense', 'social_costs', 'debit'),

-- AVSKRIVNINGAR (7800-7899) - Korrekta namn från BAS 2024
('7800', 'Avskrivning immateriella tillgångar', 'expense', 'depreciation', 'debit'),
('7810', 'Avskrivningar på immateriella anläggningstillgångar', 'expense', 'depreciation', 'debit'),
('7820', 'Avskrivningar på byggnader och markanläggningar', 'expense', 'depreciation', 'debit'),
('7830', 'Avskrivningar på maskiner och inventarier', 'expense', 'depreciation', 'debit'),

-- ÖVRIGA RÖRELSEKOSTNADER (8000-8999)
('8010', 'Förlust vid avyttring av anläggningstillgångar', 'expense', 'asset_disposal', 'debit'),
('8020', 'Nedskrivningar', 'expense', 'impairment', 'debit'),
('8040', 'Övriga rörelsekostnader', 'expense', 'other_operating', 'debit'),

-- FINANSIELLA KOSTNADER (8400-8499)
('8410', 'Räntekostnader koncernföretag', 'expense', 'interest', 'debit'),
('8420', 'Räntekostnader intresseföretag', 'expense', 'interest', 'debit'),
('8430', 'Övriga räntekostnader', 'expense', 'interest', 'debit'),
('8440', 'Förlust vid avyttring av finansiella tillgångar', 'expense', 'financial_disposal', 'debit'),
('8450', 'Nedskrivning av finansiella tillgångar', 'expense', 'financial_impairment', 'debit'),

-- BOKSLUTSDISPOSITIONER (8800-8899)
('8810', 'Koncernbidrag lämnade', 'expense', 'group_contributions', 'debit'),
('8820', 'Erhållna koncernbidrag', 'income', 'group_contributions', 'credit'),
('8830', 'Förändring av överavskrivningar', 'expense', 'tax_adjustments', 'debit'),
('8840', 'Förändring av periodiseringsfonder', 'expense', 'tax_adjustments', 'debit'),

-- SKATTER (8900-8999)
('8910', 'Skatt på årets resultat', 'expense', 'tax', 'debit'),
('8920', 'Förändring av uppskjuten skatt', 'expense', 'deferred_tax', 'debit');