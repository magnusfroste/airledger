
-- Ta bort alla kontantmetod-specifika mallar
DELETE FROM public.airledger_transaction_templates 
WHERE description ILIKE '%kontantmetoden%' 
   OR description ILIKE '%bokför när%betalar%'
   OR template_name ILIKE '%betalning%';

-- Ta bort accounting_method kolumn från profiles tabellen
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS accounting_method;
