-- Fix incorrect account types and categories for active BAS accounts

-- Fix account type for 8820 (Group contributions should be income, not expense)
UPDATE public.airledger_chart_of_accounts 
SET account_type = 'income',
    account_category = 'other_operating',
    updated_at = now()
WHERE account_code = '8820' AND is_active = true;

-- Fix normal balance for accumulated depreciation/write-down accounts 
-- These are contra-asset accounts and should have credit normal balance but be classified as assets
-- This is correct in Swedish accounting - they are contra-asset accounts
-- The current setup is actually correct for these accounts

-- Let's also fix the account code 1630 which should be for tax settlements
UPDATE public.airledger_chart_of_accounts 
SET account_name = 'Avräkning för skatter och avgifter',
    account_type = 'asset',
    account_category = 'receivables',
    normal_balance = 'debit',
    updated_at = now()
WHERE account_code = '1630' AND is_active = true;