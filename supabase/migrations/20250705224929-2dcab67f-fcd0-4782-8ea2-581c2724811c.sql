-- FULLSTÄNDIG OMBYGGNAD AV KONTOPLANEN - BAS 2024
-- Steg 1: Rensa befintlig kontoplan (säkert eftersom inga transaktioner finns)
DELETE FROM public.airledger_chart_of_accounts;

-- Steg 2: Sätt in komplett korrekt kontoplan baserad på BAS 2024 CSV
INSERT INTO public.airledger_chart_of_accounts (account_code, account_name, account_type, account_category, normal_balance) VALUES

-- TILLGÅNGAR (1000-1999)
-- 10xx - Immateriella anläggningstillgångar
('1010', 'Utvecklingsutgifter', 'asset', 'intangible_assets', 'debit'),
('1011', 'Balanserade utgifter för forskning och utveckling', 'asset', 'intangible_assets', 'debit'),
('1012', 'Balanserade utgifter för programvaror', 'asset', 'intangible_assets', 'debit'),
('1018', 'Ackumulerade nedskrivningar på balanserade utgifter', 'asset', 'intangible_assets', 'credit'),
('1019', 'Ackumulerade avskrivningar på balanserade utgifter', 'asset', 'intangible_assets', 'credit'),
('1020', 'Koncessioner, patent, licenser', 'asset', 'intangible_assets', 'debit'),
('1028', 'Ackumulerade nedskrivningar på koncessioner m.m.', 'asset', 'intangible_assets', 'credit'),
('1029', 'Ackumulerade avskrivningar på koncessioner m.m.', 'asset', 'intangible_assets', 'credit'),
('1030', 'Hyresrätter och liknande rättigheter', 'asset', 'intangible_assets', 'debit'),
('1038', 'Ackumulerade nedskrivningar på patent', 'asset', 'intangible_assets', 'credit'),
('1039', 'Ackumulerade avskrivningar på patent', 'asset', 'intangible_assets', 'credit'),
('1040', 'Varumärken', 'asset', 'intangible_assets', 'debit'),
('1048', 'Ackumulerade nedskrivningar på licenser', 'asset', 'intangible_assets', 'credit'),
('1049', 'Ackumulerade avskrivningar på licenser', 'asset', 'intangible_assets', 'credit'),
('1050', 'Goodwill', 'asset', 'intangible_assets', 'debit'),
('1058', 'Ackumulerade nedskrivningar på varumärken', 'asset', 'intangible_assets', 'credit'),
('1059', 'Ackumulerade avskrivningar på varumärken', 'asset', 'intangible_assets', 'credit'),
('1060', 'Hyresrätter, tomträtter och liknande', 'asset', 'intangible_assets', 'debit'),
('1068', 'Ackumulerade nedskrivningar på hyresrätter, tomträtter och liknande', 'asset', 'intangible_assets', 'credit'),
('1069', 'Ackumulerade avskrivningar på hyresrätter, tomträtter och liknande', 'asset', 'intangible_assets', 'credit'),
('1070', 'Goodwill', 'asset', 'intangible_assets', 'debit'),
('1078', 'Ackumulerade nedskrivningar på goodwill', 'asset', 'intangible_assets', 'credit'),
('1079', 'Ackumulerade avskrivningar på goodwill', 'asset', 'intangible_assets', 'credit'),
('1080', 'Övriga immateriella anläggningstillgångar', 'asset', 'intangible_assets', 'debit'),
('1081', 'Pågående projekt för immateriella anläggningstillgångar', 'asset', 'intangible_assets', 'debit'),
('1088', 'Förskott för immateriella anläggningstillgångar', 'asset', 'intangible_assets', 'debit'),

-- 11xx - Byggnader och mark
('1110', 'Byggnader och mark', 'asset', 'tangible_assets', 'debit'),
('1111', 'Byggnader på egen mark', 'asset', 'tangible_assets', 'debit'),
('1112', 'Byggnader på annans mark', 'asset', 'tangible_assets', 'debit'),
('1118', 'Ackumulerade nedskrivningar på byggnader', 'asset', 'tangible_assets', 'credit'),
('1119', 'Ackumulerade avskrivningar på byggnader', 'asset', 'tangible_assets', 'credit'),
('1120', 'Maskiner och andra tekniska anläggningar', 'asset', 'tangible_assets', 'debit'),
('1129', 'Ackumulerade avskrivningar på förbättringsutgifter på annans fastighet', 'asset', 'tangible_assets', 'credit'),
('1130', 'Inventarier, verktyg och installationer', 'asset', 'tangible_assets', 'debit'),
('1140', 'Pågående nyanläggningar', 'asset', 'tangible_assets', 'debit'),
('1150', 'Fordon', 'asset', 'tangible_assets', 'debit'),
('1158', 'Ackumulerade nedskrivningar på markanläggningar', 'asset', 'tangible_assets', 'credit'),
('1159', 'Ackumulerade avskrivningar på markanläggningar', 'asset', 'tangible_assets', 'credit'),
('1180', 'Pågående nyanläggningar och förskott för byggnader och mark', 'asset', 'tangible_assets', 'debit'),
('1181', 'Pågående ny-, till- och ombyggnad', 'asset', 'tangible_assets', 'debit'),
('1188', 'Förskott för byggnader och mark', 'asset', 'tangible_assets', 'debit'),
('1190', 'Övriga materiella anläggningstillgångar', 'asset', 'tangible_assets', 'debit'),
('1200', 'Inventarier', 'asset', 'tangible_assets', 'debit');