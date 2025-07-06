-- Fix incorrect BAS 2024 account names to match CSV file

-- Fix account 1930: Should be "Företagskonto/checkkonto/affärskonto" not "Checkkonto"
UPDATE airledger_chart_of_accounts 
SET account_name = 'Företagskonto/checkkonto/affärskonto',
    updated_at = now()
WHERE account_code = '1930';

-- Fix account 2450: Should be "Fakturerad men ej upparbetad intäkt" not "Växelskulder"
UPDATE airledger_chart_of_accounts 
SET account_name = 'Fakturerad men ej upparbetad intäkt',
    updated_at = now()
WHERE account_code = '2450';

-- Fix account 7210: Should be "Löner till tjänstemän" not "Socialavgifter enligt lag"
UPDATE airledger_chart_of_accounts 
SET account_name = 'Löner till tjänstemän',
    updated_at = now()
WHERE account_code = '7210';