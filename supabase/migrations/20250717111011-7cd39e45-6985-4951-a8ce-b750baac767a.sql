-- Fix incorrect classification of input VAT accounts (264x series)
-- These should be assets, not liabilities, since they represent refundable input VAT

UPDATE airledger_chart_of_accounts 
SET account_type = 'asset',
    account_category = 'current_assets',
    updated_at = now()
WHERE account_code LIKE '264%' 
  AND account_type = 'liability';

-- Specifically update the main input VAT accounts to ensure they're correctly classified
UPDATE airledger_chart_of_accounts 
SET account_type = 'asset',
    account_category = 'current_assets',
    updated_at = now()
WHERE account_code IN ('2640', '2641', '2642', '2645', '2646', '2647', '2648', '2649');