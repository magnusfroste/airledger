
-- Dynamic agent configuration table
CREATE TABLE public.agent_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  triggers TEXT[] NOT NULL DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage agent config"
  ON public.agent_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read active agent config"
  ON public.agent_config FOR SELECT
  USING (true);
