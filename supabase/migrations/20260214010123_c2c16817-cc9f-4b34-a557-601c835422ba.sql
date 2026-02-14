
-- Table for configurable warning rules (replaces hardcoded WARNING_RULES)
CREATE TABLE public.warning_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  template_names TEXT[] NOT NULL DEFAULT '{}',
  threshold_amount NUMERIC NOT NULL DEFAULT 0,
  threshold_direction TEXT NOT NULL DEFAULT 'above' CHECK (threshold_direction IN ('above', 'below', 'between')),
  threshold_max NUMERIC,
  warning_message TEXT NOT NULL,
  warning_type TEXT NOT NULL DEFAULT 'warning' CHECK (warning_type IN ('warning', 'info')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warning_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warning rules"
  ON public.warning_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read active warning rules"
  ON public.warning_rules FOR SELECT
  USING (true);

-- Seed with current hardcoded rules
INSERT INTO public.warning_rules (rule_name, template_names, threshold_amount, threshold_direction, warning_message, warning_type, sort_order) VALUES
  ('Representation moms extern', ARRAY['Extern representation mat'], 300, 'above',
   '⚠️ Momsavdrag för representation är max {threshold} kr/person exkl moms. Om beloppet avser flera personer, kontrollera att det understiger gränsen per person. Överskjutande moms är ej avdragsgill.', 'warning', 1),
  ('Representation moms intern', ARRAY['Intern representation'], 300, 'above',
   '⚠️ Intern representation: momsavdrag max {threshold} kr/person exkl moms. Ange antal deltagare för att beräkna korrekt avdrag.', 'warning', 2),
  ('Friskvårdsbidrag', ARRAY['Friskvårdsbidrag'], 5000, 'above',
   '⚠️ Friskvårdsbidrag över {threshold} kr/år är en skattepliktig förmån.', 'warning', 3),
  ('Förbrukningsinventarie', ARRAY['Förbrukningsinventarie'], 28650, 'above',
   '⚠️ Belopp över {threshold} kr (halva prisbasbeloppet) ska normalt bokföras som anläggningstillgång, inte förbrukningsinventarie.', 'warning', 4),
  ('Gåva till anställd', ARRAY['Intern representation'], 500, 'between',
   '⚠️ Gåva till anställd över {threshold} kr/tillfälle (jul, jubileum) är en skattepliktig förmån som ska förmånsbeskattas.', 'warning', 5),
  ('Traktamente inrikes', ARRAY['Traktamente inrikes'], 290, 'above',
   '⚠️ Skattefritt heldagstraktamente inrikes är max {threshold} kr/dag (2026). Belopp över detta ska förmånsbeskattas. Halvdag: max 145 kr.', 'warning', 6),
  ('Milersättning', ARRAY['Milersättning anställd'], 5000, 'above',
   '⚠️ Skattefri milersättning är max 27 kr/mil (2026). Kontrollera att beloppet inte överstiger schablonen — överskjutande del ska förmånsbeskattas.', 'warning', 7),
  ('Konferens programkrav', ARRAY['Konferens med övernattning'], 5000, 'above',
   '💡 Konferens kräver program på minst 6 timmar/dag och 30 timmar/vecka för att vara avdragsgill. Spara programmet som underlag.', 'info', 8);

-- Set threshold_max for "between" rule (gift 500-2000)
UPDATE public.warning_rules SET threshold_max = 2000 WHERE rule_name = 'Gåva till anställd';
