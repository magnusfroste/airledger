-- Rollback: Update Swedish categories back to English in transaction templates
UPDATE public.airledger_transaction_templates 
SET category = CASE 
  WHEN category = 'Försäkringar' THEN 'insurance'
  WHEN category = 'Lokalkostnader' THEN 'rent'
  WHEN category = 'Lön och personal' THEN 'salary'
  ELSE category
END
WHERE category IN ('Försäkringar', 'Lokalkostnader', 'Lön och personal');