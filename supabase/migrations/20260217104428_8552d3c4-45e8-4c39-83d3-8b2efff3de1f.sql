
-- Agent execution logs for observability
CREATE TABLE public.agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  intent TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  action_taken TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  consulted_agents TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_logs_agent ON public.agent_logs(agent_name);
CREATE INDEX idx_agent_logs_created ON public.agent_logs(created_at DESC);
CREATE INDEX idx_agent_logs_user ON public.agent_logs(user_id);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read logs
CREATE POLICY "Admin can read agent logs"
  ON public.agent_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Edge functions insert via service role (anon can too for the insert path)
CREATE POLICY "Service can insert agent logs"
  ON public.agent_logs FOR INSERT
  WITH CHECK (true);
