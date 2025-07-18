-- Lägg till kassamässig bokföring i användarprofiler
ALTER TABLE public.profiles 
ADD COLUMN accounting_method text DEFAULT 'accrual' CHECK (accounting_method IN ('cash', 'accrual'));

-- Lägg till kassaflödesrelaterade fält i transaktioner
ALTER TABLE public.airledger_transactions 
ADD COLUMN cash_flow_date date,
ADD COLUMN is_cash_transaction boolean DEFAULT false,
ADD COLUMN payment_method text;