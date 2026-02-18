-- Add fiscal_year_start to profiles (1=jan, 5=maj, 7=jul, 9=sep)
ALTER TABLE public.profiles 
ADD COLUMN fiscal_year_start integer NOT NULL DEFAULT 1 
CONSTRAINT fiscal_year_start_check CHECK (fiscal_year_start IN (1, 5, 7, 9));