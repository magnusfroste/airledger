-- Lägg till viktiga konton som saknas från BAS 2024 CSV

INSERT INTO public.airledger_chart_of_accounts (account_code, account_name, account_type, account_category, normal_balance) VALUES

-- Viktiga periodiseringsfonder och obeskattade reserver
('2120', 'Periodiseringsfond 2020', 'equity', 'tax_reserves', 'credit'),
('2121', 'Periodiseringsfond 2021', 'equity', 'tax_reserves', 'credit'),
('2122', 'Periodiseringsfond 2022', 'equity', 'tax_reserves', 'credit'),
('2123', 'Periodiseringsfond 2023', 'equity', 'tax_reserves', 'credit'),
('2124', 'Periodiseringsfond 2024', 'equity', 'tax_reserves', 'credit'),
('2125', 'Periodiseringsfond 2025', 'equity', 'tax_reserves', 'credit'),
('2150', 'Ackumulerade överavskrivningar', 'equity', 'tax_reserves', 'credit'),

-- Viktiga avsättningar
('2210', 'Avsättningar för pensioner enligt tryggandelagen', 'liability', 'provisions', 'credit'),
('2220', 'Avsättningar för garantier', 'liability', 'provisions', 'credit'),
('2290', 'Övriga avsättningar', 'liability', 'provisions', 'credit'),

-- Långfristiga skulder som saknas
('2330', 'Checkräkningskredit', 'liability', 'long_term_debt', 'credit'),
('2350', 'Andra långfristiga skulder till kreditinstitut', 'liability', 'long_term_debt', 'credit'),
('2390', 'Övriga långfristiga skulder', 'liability', 'long_term_debt', 'credit'),
('2393', 'Lån från närstående personer, långfristig del', 'liability', 'long_term_debt', 'credit'),

-- Viktiga intäktskonton som saknas
('3570', 'Faktorerade intäkter', 'income', 'factored', 'credit'),
('3590', 'Övriga fakturerade kostnader', 'income', 'other_invoiced', 'credit'),
('3610', 'Försäljning av material', 'income', 'material_sales', 'credit'),
('3670', 'Intäkter från värdepapper', 'income', 'securities', 'credit'),
('3730', 'Lämnade rabatter', 'expense', 'sales_deductions', 'debit'),
('3910', 'Hyres- och arrendeintäkter', 'income', 'rental', 'credit'),
('3920', 'Provisionsintäkter, licensintäkter och royalties', 'income', 'commission', 'credit'),
('3950', 'Återvunna, tidigare avskrivda kundfordringar', 'income', 'recovered', 'credit'),
('3970', 'Vinst vid avyttring av immateriella och materiella anläggningstillgångar', 'income', 'asset_disposal', 'credit'),

-- Specifika inköpskonton från BAS 2024
('4200', 'Sålda varor VMB', 'expense', 'cost_of_goods', 'debit'),
('4400', 'Momspliktiga inköp i Sverige', 'expense', 'cost_of_goods', 'debit'),
('4515', 'Inköp av varor från annat EU-land, 25 %', 'expense', 'cost_of_goods', 'debit'),
('4700', 'Reduktion av inköpspriser (gruppkonto)', 'expense', 'cost_reductions', 'credit'),
('4730', 'Erhållna rabatter', 'expense', 'cost_reductions', 'credit'),

-- Viktiga lokalkostnader
('5010', 'Lokalhyra', 'expense', 'premises', 'debit'),
('5070', 'Reparation och underhåll av lokaler', 'expense', 'maintenance', 'debit'),
('5200', 'Hyra av anläggningstillgångar (gruppkonto)', 'expense', 'asset_rental', 'debit'),
('5410', 'Förbrukningsinventarier', 'expense', 'consumables', 'debit'),
('5460', 'Förbrukningsmaterial', 'expense', 'consumables', 'debit'),

-- Personalkostnader enligt BAS 2024
('7210', 'Löner till kollektivanställda', 'expense', 'salaries', 'debit'),
('7220', 'Löner till företagsledare', 'expense', 'salaries', 'debit'),
('7240', 'Styrelsearvoden', 'expense', 'fees', 'debit'),
('7290', 'Förändring av semesterlöneskuld', 'expense', 'salary_provisions', 'debit'),
('7310', 'Kontanta extraersättningar', 'expense', 'compensation', 'debit'),
('7380', 'Kostnader för förmåner till anställda', 'expense', 'employee_benefits', 'debit'),
('7410', 'Pensionsförsäkringspremier', 'expense', 'pension', 'debit'),
('7510', 'Arbetsgivaravgifter 31,42 %', 'expense', 'social_costs', 'debit'),
('7530', 'Särskild löneskatt', 'expense', 'social_costs', 'debit'),
('7570', 'Premier för arbetsmarknadsförsäkringar', 'expense', 'social_costs', 'debit'),
('7580', 'Gruppförsäkringspremier', 'expense', 'insurance', 'debit'),
('7610', 'Utbildning', 'expense', 'training', 'debit'),

-- BAS 2024 avskrivningskonton (mer specifika)
('7810', 'Avskrivningar på immateriella anläggningstillgångar', 'expense', 'depreciation', 'debit'),
('7820', 'Avskrivningar på byggnader och markanläggningar', 'expense', 'depreciation', 'debit'),
('7830', 'Avskrivningar på maskiner och inventarier', 'expense', 'depreciation', 'debit'),
('7831', 'Avskrivningar på maskiner och andra tekniska anläggningar', 'expense', 'depreciation', 'debit'),
('7832', 'Avskrivningar på inventarier och verktyg', 'expense', 'depreciation', 'debit'),
('7834', 'Avskrivningar på bilar och andra transportmedel', 'expense', 'depreciation', 'debit'),
('7835', 'Avskrivningar på datorer', 'expense', 'depreciation', 'debit'),

-- Finansiella poster
('8010', 'Utdelning på andelar i koncernföretag', 'income', 'dividends', 'credit'),
('8070', 'Nedskrivningar av andelar i och långfristiga fordringar hos koncernföretag', 'expense', 'impairment', 'debit'),
('8110', 'Utdelningar på andelar i intresseföretag', 'income', 'dividends', 'credit'),

-- Bokslutsdispositioner och skatter
('8910', 'Bokslutsdispositioner', 'expense', 'year_end_adjustments', 'debit'),
('8920', 'Skatt på årets resultat', 'expense', 'tax', 'debit'),
('8930', 'Uppskjuten skatt', 'expense', 'deferred_tax', 'debit');