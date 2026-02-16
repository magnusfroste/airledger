ALTER TABLE public.airledger_transaction_templates
ADD COLUMN follow_up_templates text[] DEFAULT NULL;