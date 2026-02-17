import { Agent, AgentContext, AgentResult } from './types.ts';
import { ADVISORY_PROMPT } from './prompts/advisory.ts';
import { getAgentPrompt } from './prompts/loader.ts';
import { ConversationMessage } from '../../_shared/types.ts';
import { buildBookkeepingContext } from '../context-builder.ts';
import { aiComplete, getContent, AIProviderError } from '../../_shared/ai-client.ts';
import { FUNCTION_DEFINITIONS } from '../function-definitions.ts';
import { handleFunctionCall } from '../function-handlers.ts';
import { getToolCalls } from '../../_shared/ai-client.ts';

export class AdvisoryAgent implements Agent {
  name = 'advisory';

  async execute(ctx: AgentContext): Promise<AgentResult> {
    const { message, conversationHistory, userData, aiConfig, supabase, userId } = ctx;

    if (ctx.intent.intent === 'analyze_image') {
      return { response: '📸 Skicka bilden så analyserar jag den åt dig!', action_taken: 'clarified' };
    }

    const dynamicPrompt = await getAgentPrompt('advisory', supabase, ADVISORY_PROMPT);
    const fullContext = buildBookkeepingContext(userData);
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: `${dynamicPrompt}\n\nBOKFÖRINGSKONTEXT:\n${fullContext}` },
    ];
    if (conversationHistory?.length) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    try {
      // Include function definitions so advisory can use tools (e.g. calculate balances) when needed
      const data = await aiComplete(aiConfig, {
        messages,
        max_tokens: 1000,
        temperature: 0.3,
        tools: FUNCTION_DEFINITIONS,
        tool_choice: 'auto',
      });

      // Check if AI wants to call a function
      const toolCalls = getToolCalls(data);
      if (toolCalls.length > 0) {
        const fnName = toolCalls[0].function?.name;
        const fnArgs = JSON.parse(toolCalls[0].function?.arguments || '{}');
        console.log(`[AdvisoryAgent] Tool call: ${fnName}`);
        const sessionId = `${userId}_${Date.now()}`;
        const fnResult = await handleFunctionCall(fnName, fnArgs, supabase, sessionId);

        // Get text content too if available
        const textContent = getContent(data);
        const response = textContent ? `${textContent}${fnResult}` : fnResult;
        return { response, action_taken: 'answered' };
      }

      const response = getContent(data) || 'Jag förstod inte riktigt. Kan du omformulera?';
      return { response, action_taken: 'answered' };
    } catch (error) {
      console.error('[AdvisoryAgent] Error:', error);
      if (error instanceof AIProviderError) {
        if (error.status === 429) return { response: '⚠️ AI-tjänsten är tillfälligt överbelastad. Försök igen om en stund.', action_taken: 'answered' };
        if (error.status === 402) return { response: '⚠️ AI-krediter slut. Kontakta support.', action_taken: 'answered' };
      }
      return { response: 'Ett fel uppstod. Försök igen.', action_taken: 'answered' };
    }
  }
}
