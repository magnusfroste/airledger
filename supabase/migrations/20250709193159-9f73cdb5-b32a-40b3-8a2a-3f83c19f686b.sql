-- Add user preference columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN show_account_numbers boolean DEFAULT false,
ADD COLUMN accounting_experience text DEFAULT 'beginner',
ADD COLUMN industry text DEFAULT null;

-- Add check constraint for accounting_experience
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_accounting_experience_check 
CHECK (accounting_experience IN ('beginner', 'intermediate', 'advanced'));