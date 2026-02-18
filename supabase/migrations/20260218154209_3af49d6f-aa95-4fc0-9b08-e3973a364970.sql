
-- Create air_triggers table
CREATE TABLE public.air_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'recurring_yearly',
  month integer NOT NULL,
  day integer NOT NULL,
  days_before integer NOT NULL DEFAULT 14,
  quick_action_label text NOT NULL,
  quick_action_message text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.air_triggers ENABLE ROW LEVEL SECURITY;

-- Authenticated can read
CREATE POLICY "Authenticated can read active triggers"
  ON public.air_triggers FOR SELECT
  USING (true);

-- Admin can manage
CREATE POLICY "Admin can manage triggers"
  ON public.air_triggers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed Swedish tax deadlines
INSERT INTO public.air_triggers (name, description, trigger_type, month, day, days_before, quick_action_label, quick_action_message, priority) VALUES
  ('Momsdeklaration Q4', 'Momsdeklaration för Q4 ska vara inne 12 januari', 'recurring_yearly', 1, 12, 14, 'Momsrapport Q4', 'Visa momsrapport för Q4', 10),
  ('Momsdeklaration Q1', 'Momsdeklaration för Q1 ska vara inne 12 april', 'recurring_yearly', 4, 12, 14, 'Momsrapport Q1', 'Visa momsrapport för Q1', 10),
  ('Momsdeklaration Q2', 'Momsdeklaration för Q2 ska vara inne 12 juli', 'recurring_yearly', 7, 12, 14, 'Momsrapport Q2', 'Visa momsrapport för Q2', 10),
  ('Momsdeklaration Q3', 'Momsdeklaration för Q3 ska vara inne 12 oktober', 'recurring_yearly', 10, 12, 14, 'Momsrapport Q3', 'Visa momsrapport för Q3', 10),
  ('Inkomstdeklaration', 'Inkomstdeklaration ska vara inne senast 2 maj', 'recurring_yearly', 5, 2, 30, 'Deklaration', 'Hjälp mig förbereda inkomstdeklarationen', 20),
  ('Årsredovisning', 'Årsredovisning ska vara inne senast 28 februari', 'recurring_yearly', 2, 28, 30, 'Bokslut', 'Påbörja årsbokslut', 15);
