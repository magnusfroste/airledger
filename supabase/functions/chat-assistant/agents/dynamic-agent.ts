import { Agent, AgentContext, AgentResult } from './types.ts';
import { ConversationMessage } from '../../_shared/types.ts';
import { buildBookkeepingContext } from '../context-builder.ts';
import { aiComplete, getContent, getToolCalls, AIProviderError } from '../../_shared/ai-client.ts';
import { FUNCTION_DEFINITIONS } from '../function-definitions.ts';
import { handleFunctionCall } from '../function-handlers.ts';

export interface AgentConfig {
  agent_name: string;
  display_name: string;
  description: string | null;
  system_prompt: string;
  triggers: string[];
  tools: string[];
  is_active: boolean;
  priority: number;
}

/**
 * A generic agent driven entirely by DB configuration.
 * No code changes needed to add new specialists.
 */
export class DynamicAgent implements Agent {
  name: string;

  constructor(private config: AgentConfig) {
    this.name = config.agent_name;
  }

  async execute(ctx: AgentContext): Promise<AgentResult> {
    const { message, conversationHistory, userData, aiConfig, supabase, userId } = ctx;
    const fullContext = buildBookkeepingContext(userData);

    // Build allowed tools from config
    const allowedTools = this.config.tools?.length
      ? FUNCTION_DEFINITIONS.filter(t => this.config.tools.includes(t.function.name))
      : undefined;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: `${this.config.system_prompt}\n\nBOKFÖRINGSKONTEXT:\n${fullContext}` },
    ];

    if (conversationHistory?.length) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    try {
      const data = await aiComplete(aiConfig, {
        messages,
        max_tokens: 1200,
        temperature: 0.3,
        tools: allowedTools,
        tool_choice: allowedTools ? 'auto' : undefined,
      });

      // Handle tool calls
      const toolCalls = getToolCalls(data);
      if (toolCalls.length > 0) {
        const fnName = toolCalls[0].function?.name;
        const fnArgs = JSON.parse(toolCalls[0].function?.arguments || '{}');
        console.log(`[DynamicAgent:${this.name}] Tool call: ${fnName}`);
        const sessionId = `${userId}_${Date.now()}`;
        const fnResult = await handleFunctionCall(fnName, fnArgs, supabase, sessionId);
        const textContent = getContent(data);
        const response = textContent ? `${textContent}${fnResult}` : fnResult;
        return { response, action_taken: 'answered' };
      }

      const response = getContent(data) || 'Jag förstod inte riktigt. Kan du omformulera?';
      return { response, action_taken: 'answered' };
    } catch (error) {
      console.error(`[DynamicAgent:${this.name}] Error:`, error);
      if (error instanceof AIProviderError) {
        if (error.status === 429) return { response: '⚠️ AI-tjänsten är tillfälligt överbelastad. Försök igen om en stund.', action_taken: 'answered' };
        if (error.status === 402) return { response: '⚠️ AI-krediter slut. Kontakta support.', action_taken: 'answered' };
      }
      return { response: 'Ett fel uppstod. Försök igen.', action_taken: 'answered' };
    }
  }
}
