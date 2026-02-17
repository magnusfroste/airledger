import { ConversationMessage, IntentClassification, ExtractedData, UserData } from '../../_shared/types.ts';
import { AIProviderConfig } from '../../_shared/ai-client.ts';

/**
 * Result contract returned by every specialist agent.
 */
export interface AgentResult {
  response: string;
  action_taken?: 'booked' | 'proposed' | 'answered' | 'guided' | 'clarified';
  data?: Record<string, any>;
  follow_up_agent?: string;
  context_markers?: string[];
}

/**
 * Context passed to every agent by the orchestrator.
 */
export interface AgentContext {
  message: string;
  conversationHistory: ConversationMessage[] | undefined;
  intent: IntentClassification;
  userData: UserData;
  aiConfig: AIProviderConfig;
  supabase: any;
  userId: string;
  systemPrompt: string;
}

/**
 * Agent interface — every specialist must implement execute().
 */
export interface Agent {
  name: string;
  execute(ctx: AgentContext): Promise<AgentResult>;
}
