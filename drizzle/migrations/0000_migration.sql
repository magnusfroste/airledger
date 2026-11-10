DROP POLICY IF EXISTS "Authenticated users can read active warning rules" ON public.warning_rules;
CREATE POLICY "Authenticated users can read active warning rules" ON public.warning_rules FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated can read active agent config" ON public.agent_config;
CREATE POLICY "Authenticated can read active agent config" ON public.agent_config FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated can read active triggers" ON public.air_triggers;
CREATE POLICY "Authenticated can read active triggers" ON public.air_triggers FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.system_settings;
CREATE POLICY "Authenticated users can read settings" ON public.system_settings FOR SELECT TO authenticated
USING (key LIKE 'seo\_%' OR key LIKE 'ai\_%' OR key LIKE 'agent\_prompt\_%' OR key = 'system_prompt');