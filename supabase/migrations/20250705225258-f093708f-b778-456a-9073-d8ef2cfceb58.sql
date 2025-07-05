-- FORTSÄTTNING: Resterande tillgångar (14xx-19xx)
INSERT INTO public.airledger_chart_of_accounts (account_code, account_name, account_type, account_category, normal_balance) VALUES

-- 14xx - Lager
('1410', 'Råvaror och förnödenheter', 'asset', 'inventory', 'debit'),
('1420', 'Varor under tillverkning', 'asset', 'inventory', 'debit'),
('1430', 'Färdiga varor och handelsvaror', 'asset', 'inventory', 'debit'),
('1440', 'Pågående arbeten för annans räkning', 'asset', 'inventory', 'debit'),
('1450', 'Förskott till leverantörer', 'asset', 'inventory', 'debit'),

-- 15xx - Kundfordringar
('1510', 'Kundfordringar', 'asset', 'receivables', 'debit'),
('1512', 'Kundfordringar inom koncernen', 'asset', 'receivables', 'debit'),
('1513', 'Kundfordringar hos intresseföretag', 'asset', 'receivables', 'debit'),
('1520', 'Övriga fordringar', 'asset', 'receivables', 'debit'),
('1530', 'Fordran avseende skatter och avgifter', 'asset', 'receivables', 'debit'),
('1540', 'Förutbetalda kostnader och upplupna intäkter', 'asset', 'receivables', 'debit'),

-- 16xx - Kortfristiga placeringar
('1610', 'Kortfristiga placeringar i koncernföretag', 'asset', 'short_term_investments', 'debit'),
('1620', 'Kortfristiga placeringar i intresseföretag', 'asset', 'short_term_investments', 'debit'),
('1630', 'Avräkning för skatter och avgifter', 'asset', 'receivables', 'debit'),

-- 19xx - Kassa och bank
('1910', 'Kassa', 'asset', 'cash', 'debit'),
('1920', 'Plusgiro', 'asset', 'cash', 'debit'),
('1930', 'Checkkonto', 'asset', 'cash', 'debit'),
('1940', 'Övriga banktillgodohavanden', 'asset', 'cash', 'debit'),

-- SKULDER OCH EGET KAPITAL (2000-2999)
-- 20xx - Eget kapital
('2010', 'Aktiekapital', 'equity', 'share_capital', 'credit'),
('2018', 'Pågående emission', 'equity', 'share_capital', 'credit'),
('2070', 'Uppskrivningsfond', 'equity', 'reserves', 'credit'),
('2072', 'Reservfond', 'equity', 'reserves', 'credit'),
('2073', 'Fond för utvecklingsutgifter', 'equity', 'reserves', 'credit'),
('2077', 'Andra fonder', 'equity', 'reserves', 'credit'),
('2080', 'Överkursfond', 'equity', 'reserves', 'credit'),
('2091', 'Balanserad vinst eller förlust', 'equity', 'retained_earnings', 'credit'),
('2098', 'Vinst eller förlust från föregående år', 'equity', 'retained_earnings', 'credit'),
('2099', 'Årets resultat', 'equity', 'retained_earnings', 'credit'),

-- 21xx - Avsättningar
('2110', 'Avsättningar för pensioner', 'liability', 'provisions', 'credit'),
('2120', 'Avsättningar för skatter', 'liability', 'provisions', 'credit'),
('2130', 'Övriga avsättningar', 'liability', 'provisions', 'credit'),

-- 22xx - Långfristiga skulder
('2210', 'Banklån', 'liability', 'long_term_debt', 'credit'),
('2211', 'Banklån inom koncernen', 'liability', 'long_term_debt', 'credit'),
('2212', 'Banklån hos intresseföretag', 'liability', 'long_term_debt', 'credit'),
('2220', 'Övriga långfristiga skulder', 'liability', 'long_term_debt', 'credit'),
('2230', 'Anslutningsavgifter', 'liability', 'long_term_debt', 'credit'),
('2240', 'Skuld avseende finansiell leasing', 'liability', 'long_term_debt', 'credit'),

-- 23xx - Långfristiga skulder (tidigare tillagda)
('2310', 'Obligations- och förlagslån', 'liability', 'long_term_debt', 'credit'),
('2320', 'Konvertibla lån och liknande', 'liability', 'long_term_debt', 'credit'),
('2321', 'Konvertibla lån', 'liability', 'long_term_debt', 'credit'),
('2322', 'Lån förenade med optionsrätt', 'liability', 'long_term_debt', 'credit'),
('2323', 'Vinstandelslån', 'liability', 'long_term_debt', 'credit'),
('2324', 'Kapitalandelslån', 'liability', 'long_term_debt', 'credit'),
('2330', 'Checkräkningskredit', 'liability', 'long_term_debt', 'credit'),
('2331', 'Checkräkningskredit 1', 'liability', 'long_term_debt', 'credit'),
('2332', 'Checkräkningskredit 2', 'liability', 'long_term_debt', 'credit'),
('2340', 'Byggnadskreditiv', 'liability', 'long_term_debt', 'credit'),
('2350', 'Andra långfristiga skulder till kreditinstitut', 'liability', 'long_term_debt', 'credit'),
('2351', 'Fastighetslån, långfristig del', 'liability', 'long_term_debt', 'credit'),
('2355', 'Långfristiga lån i utländsk valuta från kreditinstitut', 'liability', 'long_term_debt', 'credit'),
('2359', 'Övriga långfristiga lån från kreditinstitut', 'liability', 'long_term_debt', 'credit'),
('2360', 'Långfristiga skulder till koncernföretag', 'liability', 'long_term_debt', 'credit'),
('2361', 'Långfristiga skulder till moderföretag', 'liability', 'long_term_debt', 'credit'),
('2362', 'Långfristiga skulder till dotterföretag', 'liability', 'long_term_debt', 'credit'),
('2363', 'Långfristiga skulder till andra koncernföretag', 'liability', 'long_term_debt', 'credit'),
('2370', 'Långfristiga skulder till intresseföretag, gemensamt styrda företag och övriga företag som det finns ett ägarintresse i', 'liability', 'long_term_debt', 'credit'),
('2371', 'Långfristiga skulder till intresseföretag', 'liability', 'long_term_debt', 'credit'),
('2372', 'Långfristiga skulder till gemensamt styrda företag', 'liability', 'long_term_debt', 'credit'),
('2373', 'Långfristiga skulder till övriga företag som det finns ett ägarintresse i', 'liability', 'long_term_debt', 'credit'),
('2390', 'Övriga långfristiga skulder', 'liability', 'long_term_debt', 'credit'),
('2391', 'Avbetalningskontrakt, långfristig del', 'liability', 'long_term_debt', 'credit'),
('2392', 'Villkorliga långfristiga skulder', 'liability', 'long_term_debt', 'credit'),
('2393', 'Lån från närstående personer, långfristig del', 'liability', 'long_term_debt', 'credit'),
('2394', 'Långfristiga leverantörskrediter', 'liability', 'long_term_debt', 'credit'),
('2395', 'Andra långfristiga lån i utländsk valuta', 'liability', 'long_term_debt', 'credit'),
('2396', 'Derivat', 'liability', 'long_term_debt', 'credit'),
('2397', 'Mottagna depositioner, långfristiga', 'liability', 'long_term_debt', 'credit'),
('2399', 'Övriga långfristiga skulder', 'liability', 'long_term_debt', 'credit');