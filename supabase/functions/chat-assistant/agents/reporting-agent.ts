import { Agent, AgentContext, AgentResult } from './types.ts';
import { REPORTING_PROMPT } from './prompts/reporting.ts';
import { getAgentPrompt } from './prompts/loader.ts';
import { ConversationMessage } from '../../_shared/types.ts';
import { handleFunctionCall } from '../function-handlers.ts';
import { buildBookkeepingContext } from '../context-builder.ts';
import { aiComplete, getContent, AIProviderError } from '../../_shared/ai-client.ts';

export class ReportingAgent implements Agent {
  name = 'reporting';

  async execute(ctx: AgentContext): Promise<AgentResult> {
    switch (ctx.intent.intent) {
      case 'vat_report':
        return this.handleVatReport(ctx);
      case 'account_balance':
        return this.handleAccountBalance(ctx);
      case 'period_reconciliation':
        return this.handleReconciliation(ctx);
      case 'year_end':
        return this.handleYearEnd(ctx);
      case 'view_report':
      default:
        return this.handleGenericReport(ctx);
    }
  }

  private async handleVatReport(ctx: AgentContext): Promise<AgentResult> {
    const { intent, supabase, userId, message, conversationHistory, userData, aiConfig, systemPrompt } = ctx;
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3);
    const year = now.getFullYear();
    const periodStart = intent.extracted_data.date || `${year}-${String(q * 3 + 1).padStart(2, '0')}-01`;
    const qEnd = new Date(year, q * 3 + 3, 0);
    const periodEnd = qEnd.toISOString().split('T')[0];

    const sessionId = `${userId}_${Date.now()}`;
    let response = await handleFunctionCall('calculate_vat_report', { periodStart, periodEnd }, supabase, sessionId);
    if (!response) {
      const fullContext = buildBookkeepingContext(userData);
      response = await this.handleFullAICall(message, conversationHistory, fullContext, aiConfig, systemPrompt, supabase);
    }
    return { response, action_taken: 'answered' };
  }

  private async handleAccountBalance(ctx: AgentContext): Promise<AgentResult> {
    const { intent, supabase, userId, message, conversationHistory, userData, aiConfig, systemPrompt } = ctx;
    const accountCode = intent.extracted_data.reference || '';
    if (accountCode) {
      const sessionId = `${userId}_${Date.now()}`;
      const response = await handleFunctionCall('calculate_account_balance', { accountCode }, supabase, sessionId);
      return { response, action_taken: 'answered' };
    }
    const fullContext = buildBookkeepingContext(userData);
    const response = await this.handleFullAICall(message, conversationHistory, fullContext, aiConfig, systemPrompt, supabase);
    return { response, action_taken: 'clarified' };
  }

  private async handleReconciliation(ctx: AgentContext): Promise<AgentResult> {
    const { intent, supabase, userId, message, conversationHistory, userData, aiConfig, systemPrompt } = ctx;
    const accountCode = intent.extracted_data.reference || '';
    if (accountCode) {
      const sessionId = `${userId}_${Date.now()}`;
      const response = await handleFunctionCall('calculate_account_balance', {
        accountCode,
        periodStart: intent.extracted_data.date || undefined,
      }, supabase, sessionId);
      return { response, action_taken: 'answered' };
    }
    const fullContext = buildBookkeepingContext(userData);
    const response = await this.handleFullAICall(message, conversationHistory, fullContext, aiConfig, systemPrompt, supabase);
    return { response, action_taken: 'clarified' };
  }

  private async handleYearEnd(ctx: AgentContext): Promise<AgentResult> {
    const { message, intent, supabase, userId } = ctx;
    const yearMatch = message.match(/\b(20\d{2})\b/);
    let year: number;
    if (yearMatch) {
      year = parseInt(yearMatch[1]);
    } else if (intent.extracted_data.date) {
      year = parseInt(intent.extracted_data.date.substring(0, 4));
    } else {
      year = new Date().getFullYear() - (new Date().getMonth() < 3 ? 1 : 0);
    }
    console.log(`[ReportingAgent] Year-end: year=${year}`);
    const sessionId = `${userId}_${Date.now()}`;
    const response = await handleFunctionCall('get_year_end_checklist', { fiscalYear: year }, supabase, sessionId);
    return { response, action_taken: 'guided' };
  }

  private async handleGenericReport(ctx: AgentContext): Promise<AgentResult> {
    const fullContext = buildBookkeepingContext(ctx.userData);
    const response = await this.handleFullAICall(ctx.message, ctx.conversationHistory, fullContext, ctx.aiConfig, ctx.systemPrompt, ctx.supabase);
    return { response, action_taken: 'answered' };
  }

  private async handleFullAICall(
    message: string, conversationHistory: ConversationMessage[] | undefined,
    context: string, aiConfig: any, systemPrompt: string, supabase?: any
  ): Promise<string> {
    const dynamicPrompt = supabase ? await getAgentPrompt('reporting', supabase, REPORTING_PROMPT) : REPORTING_PROMPT;
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: `${dynamicPrompt}\n\nBOKFÖRINGSKONTEXT:\n${context}` },
    ];
    if (conversationHistory?.length) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    try {
      const data = await aiComplete(aiConfig, { messages, max_tokens: 1000, temperature: 0.3 });
      return getContent(data) || 'Jag förstod inte riktigt. Kan du omformulera?';
    } catch (error) {
      if (error instanceof AIProviderError) {
        if (error.status === 429) return '⚠️ AI-tjänsten är tillfälligt överbelastad. Försök igen om en stund.';
        if (error.status === 402) return '⚠️ AI-krediter slut. Kontakta support.';
      }
      return 'Ett fel uppstod. Försök igen.';
    }
  }
}
