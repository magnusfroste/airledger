-- Remove unnecessary cash flow columns from airledger_transactions
ALTER TABLE public.airledger_transactions 
DROP COLUMN IF EXISTS cash_flow_date,
DROP COLUMN IF EXISTS is_cash_transaction,
DROP COLUMN IF EXISTS payment_method;