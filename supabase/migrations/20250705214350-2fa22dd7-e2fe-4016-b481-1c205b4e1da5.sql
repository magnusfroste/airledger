-- Fix incorrect account name for 1630 in BAS 2024 chart of accounts
UPDATE airledger_chart_of_accounts 
SET account_name = 'Avräkning för skatter och avgifter',
    account_type = 'asset',
    updated_at = now()
WHERE account_code = '1630';

-- Also verify and fix account type/category if needed
-- 1630 should be an asset account for tax settlements