/**
 * Dynamic prompt loader — checks system_settings for overrides, falls back to hardcoded.
 */

export async function getAgentPrompt(
  agentName: string,
  supabase: any,
  defaultPrompt: string
): Promise<string> {
  try {
    const key = `agent_prompt_${agentName}`;
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();
    if (data?.value) return data.value;
  } catch {
    // No override found — use default
  }
  return defaultPrompt;
}
