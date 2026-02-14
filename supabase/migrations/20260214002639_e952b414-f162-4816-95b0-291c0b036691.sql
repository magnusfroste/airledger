
ALTER TABLE public.airledger_transaction_templates
  ADD COLUMN auto_suggest BOOLEAN NOT NULL DEFAULT true;
