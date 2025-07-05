-- Create function to update timestamps for airledger_opening table
CREATE OR REPLACE FUNCTION public.update_airledger_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;