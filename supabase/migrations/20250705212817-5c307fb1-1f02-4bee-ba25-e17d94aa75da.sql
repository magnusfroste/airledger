-- Create chart of accounts table for BAS 2024
CREATE TABLE public.airledger_chart_of_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code text NOT NULL UNIQUE,
  account_name text NOT NULL,
  account_type text NOT NULL, -- 'asset', 'liability', 'equity', 'income', 'expense'
  account_category text NOT NULL, -- more specific categorization
  normal_balance text NOT NULL, -- 'debit' or 'credit'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.airledger_chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (all users can see the chart of accounts)
CREATE POLICY "Chart of accounts is publicly readable" 
ON public.airledger_chart_of_accounts 
FOR SELECT 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_chart_of_accounts_updated_at
BEFORE UPDATE ON public.airledger_chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert BAS 2024 chart of accounts
INSERT INTO public.airledger_chart_of_accounts (account_code, account_name, account_type, account_category, normal_balance) VALUES
-- TILLGÅNGAR (1000-1999)
('1010', 'Utvecklingsutgifter', 'asset', 'intangible_assets', 'debit'),
('1020', 'Koncessioner, patent, licenser', 'asset', 'intangible_assets', 'debit'),
('1030', 'Hyresrätter och liknande rättigheter', 'asset', 'intangible_assets', 'debit'),
('1040', 'Varumärken', 'asset', 'intangible_assets', 'debit'),
('1050', 'Goodwill', 'asset', 'intangible_assets', 'debit'),
('1080', 'Övriga immateriella anläggningstillgångar', 'asset', 'intangible_assets', 'debit'),

('1110', 'Byggnader och mark', 'asset', 'tangible_assets', 'debit'),
('1120', 'Maskiner och andra tekniska anläggningar', 'asset', 'tangible_assets', 'debit'),
('1130', 'Inventarier, verktyg och installationer', 'asset', 'tangible_assets', 'debit'),
('1140', 'Pågående nyanläggningar', 'asset', 'tangible_assets', 'debit'),
('1150', 'Fordon', 'asset', 'tangible_assets', 'debit'),
('1190', 'Övriga materiella anläggningstillgångar', 'asset', 'tangible_assets', 'debit'),
('1200', 'Inventarier', 'asset', 'tangible_assets', 'debit'),

('1310', 'Andelar i koncernföretag', 'asset', 'financial_assets', 'debit'),
('1320', 'Fordringar hos koncernföretag', 'asset', 'financial_assets', 'debit'),
('1330', 'Andelar i intresseföretag', 'asset', 'financial_assets', 'debit'),
('1340', 'Fordringar hos intresseföretag', 'asset', 'financial_assets', 'debit'),
('1350', 'Andra långfristiga värdepappersinnehav', 'asset', 'financial_assets', 'debit'),
('1360', 'Andra långfristiga fordringar', 'asset', 'financial_assets', 'debit'),

('1410', 'Råvaror och förnödenheter', 'asset', 'inventory', 'debit'),
('1420', 'Varor under tillverkning', 'asset', 'inventory', 'debit'),
('1430', 'Färdiga varor och handelsvaror', 'asset', 'inventory', 'debit'),
('1440', 'Pågående arbeten för annans räkning', 'asset', 'inventory', 'debit'),
('1450', 'Förskott till leverantörer', 'asset', 'inventory', 'debit'),

('1510', 'Kundfordringar', 'asset', 'receivables', 'debit'),
('1512', 'Kundfordringar inom koncernen', 'asset', 'receivables', 'debit'),
('1513', 'Kundfordringar hos intresseföretag', 'asset', 'receivables', 'debit'),
('1520', 'Övriga fordringar', 'asset', 'receivables', 'debit'),
('1530', 'Fordran avseende skatter och avgifter', 'asset', 'receivables', 'debit'),
('1540', 'Förutbetalda kostnader och upplupna intäkter', 'asset', 'receivables', 'debit'),

('1610', 'Kortfristiga placeringar i koncernföretag', 'asset', 'short_term_investments', 'debit'),
('1620', 'Kortfristiga placeringar i intresseföretag', 'asset', 'short_term_investments', 'debit'),
('1630', 'Övriga kortfristiga placeringar', 'asset', 'short_term_investments', 'debit'),

('1910', 'Kassa', 'asset', 'cash', 'debit'),
('1920', 'Plusgiro', 'asset', 'cash', 'debit'),
('1930', 'Checkkonto', 'asset', 'cash', 'debit'),
('1940', 'Övriga banktillgodohavanden', 'asset', 'cash', 'debit'),

-- SKULDER OCH EGET KAPITAL (2000-2999)
('2010', 'Aktiekapital', 'equity', 'share_capital', 'credit'),
('2018', 'Pågående emission', 'equity', 'share_capital', 'credit'),
('2070', 'Uppskrivningsfond', 'equity', 'reserves', 'credit'),
('2072', 'Reservfond', 'equity', 'reserves', 'credit'),
('2073', 'Fond för utvecklingsutgifter', 'equity', 'reserves', 'credit'),
('2077', 'Andra fonder', 'equity', 'reserves', 'credit'),
('2080', 'Överkursfond', 'equity', 'reserves', 'credit'),
('2091', 'Balanserad vinst eller förlust', 'equity', 'retained_earnings', 'credit'),
('2099', 'Årets resultat', 'equity', 'retained_earnings', 'credit'),

('2110', 'Avsättningar för pensioner', 'liability', 'provisions', 'credit'),
('2120', 'Avsättningar för skatter', 'liability', 'provisions', 'credit'),
('2130', 'Övriga avsättningar', 'liability', 'provisions', 'credit'),

('2210', 'Banklån', 'liability', 'long_term_debt', 'credit'),
('2211', 'Banklån inom koncernen', 'liability', 'long_term_debt', 'credit'),
('2212', 'Banklån hos intresseföretag', 'liability', 'long_term_debt', 'credit'),
('2220', 'Övriga långfristiga skulder', 'liability', 'long_term_debt', 'credit'),
('2230', 'Anslutningsavgifter', 'liability', 'long_term_debt', 'credit'),
('2240', 'Skuld avseende finansiell leasing', 'liability', 'long_term_debt', 'credit'),

('2310', 'Konvertibla skuldebrev', 'liability', 'convertible_debt', 'credit'),
('2320', 'Övriga långfristiga skulder', 'liability', 'convertible_debt', 'credit'),

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

-- INTÄKTER (3000-3999)
('3000', 'Försäljning', 'income', 'sales', 'credit'),
('3001', 'Försäljning inom koncernen', 'income', 'sales', 'credit'),
('3002', 'Försäljning till intresseföretag', 'income', 'sales', 'credit'),
('3010', 'Försäljning av tjänster', 'income', 'services', 'credit'),
('3040', 'Hyresintäkter', 'income', 'rental', 'credit'),
('3050', 'Provisionsintäkter', 'income', 'commission', 'credit'),
('3060', 'Licensintäkter', 'income', 'license', 'credit'),
('3070', 'Fakturerade frakter', 'income', 'freight', 'credit'),
('3080', 'Valutakursvinster', 'income', 'currency', 'credit'),
('3090', 'Övriga rörelseintäkter', 'income', 'other_operating', 'credit'),

('3410', 'Återföring av nedskrivningar', 'income', 'reversals', 'credit'),
('3420', 'Vinst vid avyttring av anläggningstillgångar', 'income', 'asset_disposal', 'credit'),
('3450', 'Återförda avsättningar', 'income', 'reversals', 'credit'),
('3460', 'Erhållna bidrag', 'income', 'grants', 'credit'),

('3510', 'Ränteintäkter från koncernföretag', 'income', 'interest', 'credit'),
('3520', 'Ränteintäkter från intresseföretag', 'income', 'interest', 'credit'),
('3530', 'Övriga ränteintäkter', 'income', 'interest', 'credit'),
('3540', 'Utdelningar från koncernföretag', 'income', 'dividends', 'credit'),
('3550', 'Utdelningar från intresseföretag', 'income', 'dividends', 'credit'),
('3560', 'Övriga utdelningar', 'income', 'dividends', 'credit'),
('3570', 'Vinst vid avyttring av finansiella tillgångar', 'income', 'financial_disposal', 'credit'),

('3740', 'Öres- och kronutjämning', 'income', 'rounding', 'credit'),

-- KOSTNADER FÖR SÅLDA VAROR (4000-4999)
('4000', 'Inköp av varor', 'expense', 'cost_of_goods', 'debit'),
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

-- ÖVRIGA EXTERNA KOSTNADER (6000-6999)
('6000', 'Lokalhyra', 'expense', 'premises', 'debit'),
('6010', 'Elkostnad', 'expense', 'utilities', 'debit'),
('6020', 'Uppvärmning', 'expense', 'utilities', 'debit'),
('6030', 'Vatten och avlopp', 'expense', 'utilities', 'debit'),
('6040', 'Städning', 'expense', 'premises', 'debit'),
('6050', 'Reparationer och underhåll', 'expense', 'maintenance', 'debit'),
('6060', 'Fastighetsskatt och avgifter', 'expense', 'premises', 'debit'),
('6070', 'Övriga lokalkostnader', 'expense', 'premises', 'debit'),

('6100', 'Kontorsmaterial', 'expense', 'office', 'debit'),
('6110', 'Trycksaker', 'expense', 'office', 'debit'),
('6150', 'Tidningar, tidskrifter', 'expense', 'office', 'debit'),
('6160', 'Förbrukningsmaterial', 'expense', 'office', 'debit'),
('6170', 'Programvaror', 'expense', 'office', 'debit'),
('6200', 'Telefon', 'expense', 'communication', 'debit'),
('6210', 'Mobiltelefon', 'expense', 'communication', 'debit'),
('6220', 'Internetkostnader', 'expense', 'communication', 'debit'),
('6230', 'Porto', 'expense', 'communication', 'debit'),

('6300', 'Marknadsföring', 'expense', 'marketing', 'debit'),
('6310', 'Annonsering', 'expense', 'marketing', 'debit'),
('6320', 'Reklamtrycksaker', 'expense', 'marketing', 'debit'),
('6330', 'Övrigt reklam och PR', 'expense', 'marketing', 'debit'),

('6400', 'Resekostnader', 'expense', 'travel', 'debit'),
('6410', 'Biljetter', 'expense', 'travel', 'debit'),
('6420', 'Logi', 'expense', 'travel', 'debit'),
('6430', 'Måltider på resa', 'expense', 'travel', 'debit'),
('6440', 'Bilkostnader', 'expense', 'vehicle', 'debit'),
('6450', 'Mil- och traktamenten', 'expense', 'travel', 'debit'),

('6500', 'Reparation och underhåll av inventarier', 'expense', 'maintenance', 'debit'),
('6510', 'Förbrukning av verktyg', 'expense', 'tools', 'debit'),
('6520', 'Arbetskläder och skyddsmaterial', 'expense', 'safety', 'debit'),
('6570', 'Kontorsmaterial', 'expense', 'office', 'debit'),

('6800', 'Revision', 'expense', 'professional', 'debit'),
('6810', 'Juridik', 'expense', 'professional', 'debit'),
('6820', 'Konsultarvoden', 'expense', 'professional', 'debit'),
('6830', 'Bankavgifter', 'expense', 'financial', 'debit'),
('6840', 'Factoring', 'expense', 'financial', 'debit'),
('6850', 'Försäkringar', 'expense', 'insurance', 'debit'),
('6860', 'Övriga externa kostnader', 'expense', 'other_external', 'debit'),

-- PERSONALKOSTNADER (7000-7999)
('7010', 'Löner till kollektivanställda', 'expense', 'salaries', 'debit'),
('7020', 'Löner till tjänstemän', 'expense', 'salaries', 'debit'),
('7030', 'Löner till verkställande direktör', 'expense', 'salaries', 'debit'),
('7080', 'Arvoden styrelse och revisorer', 'expense', 'fees', 'debit'),
('7090', 'Övriga ersättningar', 'expense', 'compensation', 'debit'),

('7210', 'Socialavgifter enligt lag', 'expense', 'social_costs', 'debit'),
('7220', 'Avgifter för tjänstepension', 'expense', 'pension', 'debit'),
('7230', 'Övriga sociala kostnader', 'expense', 'social_costs', 'debit'),

-- AVSKRIVNINGAR (7800-7899)
('7800', 'Avskrivning immateriella tillgångar', 'expense', 'depreciation', 'debit'),
('7810', 'Avskrivning byggnader', 'expense', 'depreciation', 'debit'),
('7820', 'Avskrivning maskiner', 'expense', 'depreciation', 'debit'),
('7830', 'Avskrivning inventarier', 'expense', 'depreciation', 'debit'),
('7831', 'Avskrivning datorer', 'expense', 'depreciation', 'debit'),
('7832', 'Avskrivning bilar', 'expense', 'depreciation', 'debit'),

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