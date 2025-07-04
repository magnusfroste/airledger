-- Create table for opening balances
CREATE TABLE public.airledger_opening (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('debit', 'credit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_code)
);

-- Enable Row Level Security
ALTER TABLE public.airledger_opening ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own opening balances" 
ON public.airledger_opening 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own opening balances" 
ON public.airledger_opening 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opening balances" 
ON public.airledger_opening 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opening balances" 
ON public.airledger_opening 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_airledger_opening_updated_at
BEFORE UPDATE ON public.airledger_opening
FOR EACH ROW
EXECUTE FUNCTION public.update_airledger_updated_at_column();