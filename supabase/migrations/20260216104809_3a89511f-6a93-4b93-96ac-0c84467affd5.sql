
-- Add required_fields column to support multi-field data collection
ALTER TABLE public.airledger_transaction_templates
ADD COLUMN IF NOT EXISTS required_fields jsonb DEFAULT NULL;

COMMENT ON COLUMN public.airledger_transaction_templates.required_fields IS 'JSON array defining fields the template needs beyond standard amount/date/description. Each entry: {key, label, prompt, type, maps_to_entry?, calc?}';
