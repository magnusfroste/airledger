-- Create enum for transaction types
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');

-- Create enum for transaction status
CREATE TYPE transaction_status AS ENUM ('draft', 'posted', 'reconciled');

-- Create master transactions table
CREATE TABLE public.airledger_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_date DATE NOT NULL,
  reference_number TEXT,
  description TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  transaction_type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'draft',
  image_url TEXT,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create detail entries table (double-entry bookkeeping)
CREATE TABLE public.airledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.airledger_transactions(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit_amount DECIMAL(10,2) DEFAULT 0,
  credit_amount DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.airledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airledger_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.airledger_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.airledger_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.airledger_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.airledger_transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for entries
CREATE POLICY "Users can view entries for their transactions" 
ON public.airledger_entries 
FOR SELECT 
USING (transaction_id IN (
  SELECT id FROM public.airledger_transactions WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create entries for their transactions" 
ON public.airledger_entries 
FOR INSERT 
WITH CHECK (transaction_id IN (
  SELECT id FROM public.airledger_transactions WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update entries for their transactions" 
ON public.airledger_entries 
FOR UPDATE 
USING (transaction_id IN (
  SELECT id FROM public.airledger_transactions WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete entries for their transactions" 
ON public.airledger_entries 
FOR DELETE 
USING (transaction_id IN (
  SELECT id FROM public.airledger_transactions WHERE user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_airledger_transactions_user_id ON public.airledger_transactions(user_id);
CREATE INDEX idx_airledger_transactions_date ON public.airledger_transactions(transaction_date);
CREATE INDEX idx_airledger_entries_transaction_id ON public.airledger_entries(transaction_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_airledger_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_airledger_transactions_updated_at
BEFORE UPDATE ON public.airledger_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_airledger_updated_at_column();