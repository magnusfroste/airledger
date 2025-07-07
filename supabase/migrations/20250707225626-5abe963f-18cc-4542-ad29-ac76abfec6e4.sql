-- Update English categories to Swedish in transaction templates
UPDATE public.airledger_transaction_templates 
SET category = CASE 
  WHEN category = 'insurance' THEN 'Försäkringar'
  WHEN category = 'rent' THEN 'Lokalkostnader'
  WHEN category = 'salary' THEN 'Lön och personal'
  ELSE category
END
WHERE category IN ('insurance', 'rent', 'salary');