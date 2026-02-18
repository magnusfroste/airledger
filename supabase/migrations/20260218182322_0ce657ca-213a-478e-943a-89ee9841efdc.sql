-- Add flag to indicate trigger dates should shift with fiscal year
ALTER TABLE public.air_triggers ADD COLUMN relative_to_fiscal_year boolean NOT NULL DEFAULT false;

-- Mark Årsredovisning and Inkomstdeklaration as fiscal-year-relative
-- These deadlines shift when the company uses a broken fiscal year
UPDATE public.air_triggers SET relative_to_fiscal_year = true WHERE name IN ('Årsredovisning', 'Inkomstdeklaration');