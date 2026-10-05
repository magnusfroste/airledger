-- 1. Kvittobucketen var publik: alla kvitton gick att nå via URL. Appen
--    använder redan signerade länkar, så bucketen görs privat.
update storage.buckets set public = false where id = 'receipts';

-- 2. Användare kunde uppdatera sin egen usage_tracking-rad och nollställa
--    AI-kvoten. Kvoten skrivs bara av edge-funktioner med service_role.
drop policy if exists "Users can update own usage" on public.usage_tracking;
drop policy if exists "Users can insert own usage" on public.usage_tracking;

-- 3. Agentinställningar, triggers och varningsregler var läsbara för
--    utloggade. Nu bara för inloggade.
drop policy if exists "Authenticated can read active agent config" on public.agent_config;
create policy "Authenticated can read active agent config" on public.agent_config for select to authenticated using (true);
drop policy if exists "Authenticated can read active triggers" on public.air_triggers;
create policy "Authenticated can read active triggers" on public.air_triggers for select to authenticated using (true);
drop policy if exists "Authenticated users can read active warning rules" on public.warning_rules;
create policy "Authenticated users can read active warning rules" on public.warning_rules for select to authenticated using (true);

-- 4. Vem som helst kunde skriva i agent_logs.
drop policy if exists "Service can insert agent logs" on public.agent_logs;
create policy "Service can insert agent logs" on public.agent_logs for insert to authenticated with check (true);
