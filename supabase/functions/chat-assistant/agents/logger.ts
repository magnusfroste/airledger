/**
 * Per-agent execution logger for observability.
 * Writes to agent_logs table asynchronously.
 */

export interface AgentLogEntry {
  userId: string;
  agentName: string;
  intent: string;
  executionTimeMs: number;
  actionTaken?: string;
  success: boolean;
  errorMessage?: string;
  consultedAgents?: string[];
}

export async function logAgentExecution(
  supabase: any,
  log: AgentLogEntry
): Promise<void> {
  try {
    await supabase.from('agent_logs').insert({
      user_id: log.userId,
      agent_name: log.agentName,
      intent: log.intent,
      execution_time_ms: log.executionTimeMs,
      action_taken: log.actionTaken,
      success: log.success,
      error_message: log.errorMessage,
      consulted_agents: log.consultedAgents,
    });
  } catch (err) {
    console.error('[AgentLogger] Failed to log:', err);
  }
}
