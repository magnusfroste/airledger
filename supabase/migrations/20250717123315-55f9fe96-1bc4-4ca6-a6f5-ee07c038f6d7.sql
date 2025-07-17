-- Update the existing Momsredovisning template with correct logic
UPDATE public.airledger_transaction_templates 
SET 
    template_entries = '[
        {
            "account_code": "2610",
            "account_name": "Utgående moms",
            "type": "debit",
            "description": "Minska utgående moms"
        },
        {
            "account_code": "2641",
            "account_name": "Ingående moms",
            "type": "credit",
            "description": "Minska ingående moms"
        },
        {
            "account_code": "2650",
            "account_name": "Redovisningskonto för moms",
            "type": "credit",
            "description": "Skuld till Skatteverket"
        }
    ]'::jsonb,
    description = 'Mall för månatlig/kvartalsvis momsredovisning. Debiterar utgående moms (2610), krediterar ingående moms (2641) och flyttar nettoskulden till 2650 för betalning till Skatteverket.',
    keywords = ARRAY['moms', 'momsredovisning', 'skatteverket', 'utgående moms', 'ingående moms', 'momsdeklaration', 'periodisk', 'kvartalsvis', 'månatlig'],
    updated_at = now()
WHERE template_name = 'Momsredovisning' AND is_system_template = true;