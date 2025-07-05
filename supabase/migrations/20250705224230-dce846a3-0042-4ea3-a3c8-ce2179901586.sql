-- Fix account names and categories for 2091 and 2098 to match BAS 2024 CSV
UPDATE public.airledger_chart_of_accounts 
SET 
    account_name = 'Balanserad vinst eller förlust',
    account_category = 'retained_earnings',
    updated_at = now()
WHERE account_code = '2091';

UPDATE public.airledger_chart_of_accounts 
SET 
    account_name = 'Vinst eller förlust från föregående år',
    account_category = 'retained_earnings',
    updated_at = now()
WHERE account_code = '2098';