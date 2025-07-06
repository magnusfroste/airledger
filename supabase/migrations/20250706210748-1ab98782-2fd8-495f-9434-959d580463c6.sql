-- Fix incorrect BAS 2024 account definitions

-- Fix account 2510: Should be "Skatteskulder" not "Kortfristiga skulder till anställda"
UPDATE airledger_chart_of_accounts 
SET account_name = 'Skatteskulder',
    updated_at = now()
WHERE account_code = '2510';

-- Fix account 2086: Should be "Reservfond" not "Andra bundna fonder" 
UPDATE airledger_chart_of_accounts 
SET account_name = 'Reservfond',
    updated_at = now()
WHERE account_code = '2086';