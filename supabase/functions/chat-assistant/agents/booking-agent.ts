import { Agent, AgentContext, AgentResult } from './types.ts';
import { BOOKING_PROMPT } from './prompts/booking.ts';
import { getAgentPrompt } from './prompts/loader.ts';
import { ConversationMessage } from '../../_shared/types.ts';
import { matchTemplate } from '../template-matcher.ts';
import { analyzeRequiredFields, calculateTemplateAmounts } from '../field-analyzer.ts';
import { formatBookingProposal, formatClarificationRequest, formatMissingDataPrompt, formatFollowUpSuggestion } from '../response-formatter.ts';
import { handleFunctionCall } from '../function-handlers.ts';
import { buildBookkeepingContext } from '../context-builder.ts';
import { classifyIntent } from '../intent-classifier.ts';
import { buildLightContext } from '../context-builder.ts';
import { FUNCTION_DEFINITIONS } from '../function-definitions.ts';
import { aiComplete, getContent, getToolCalls, AIProviderError } from '../../_shared/ai-client.ts';

export class BookingAgent implements Agent {
  name = 'booking';

  async execute(ctx: AgentContext): Promise<AgentResult> {
    const { message, conversationHistory, intent, userData, aiConfig, supabase, userId, systemPrompt } = ctx;

    switch (intent.intent) {
      case 'opening_balance':
        return this.handleOpeningBalance(ctx);
      case 'confirm_booking':
        return this.handleConfirmation(ctx);
      default:
        return this.handleBooking(ctx);
    }
  }

  private async handleOpeningBalance(ctx: AgentContext): Promise<AgentResult> {
    const { intent, supabase, userId } = ctx;
    if (intent.extracted_data.amount) {
      const sessionId = `${userId}_${Date.now()}`;
      const args = {
        accountCode: intent.extracted_data.reference || '1930',
        accountName: intent.extracted_data.description || 'Checkkonto/Bankkonto',
        amount: intent.extracted_data.amount,
      };
      const response = await handleFunctionCall('save_opening_balance', args, supabase, sessionId);
      return { response, action_taken: 'booked' };
    }
    return {
      response: formatClarificationRequest('Vilket konto och belopp vill du registrera som ingående balans?'),
      action_taken: 'clarified',
    };
  }

  private async handleConfirmation(ctx: AgentContext): Promise<AgentResult> {
    const { message, conversationHistory, intent, userData, aiConfig, supabase, userId, systemPrompt } = ctx;

    if (!conversationHistory?.length) {
      return { response: 'Det finns ingen pågående bokning att bekräfta. Beskriv vad du vill bokföra.', action_taken: 'clarified' };
    }

    // Check if year-end context — delegate back via advisory
    const lastAiMessage = [...conversationHistory].reverse().find(
      (msg: ConversationMessage) => msg.sender === 'ai'
    );
    if (lastAiMessage && (lastAiMessage.content.includes('årsbokslut') || lastAiMessage.content.includes('Checklista') || lastAiMessage.content.includes('bokslutet steg'))) {
      const fullContext = buildBookkeepingContext(userData);
      const response = await this.handleFullAICall(message, conversationHistory, fullContext, aiConfig, systemPrompt);
      return { response, action_taken: 'guided' };
    }

    // Find last booking proposal
    const lastProposal = [...conversationHistory].reverse().find(
      (msg: ConversationMessage) => msg.sender === 'ai' && msg.content.includes('Bokföringsförslag')
    );

    if (lastProposal) {
      const parsedEntries = this.parseProposalEntries(lastProposal.content);
      const parsedDate = lastProposal.content.match(/\*\*Datum:\*\*\s*(\d{4}-\d{2}-\d{2})/)?.[1] || new Date().toISOString().split('T')[0];
      const parsedDesc = lastProposal.content.match(/\*\*Beskrivning:\*\*\s*(.+)/)?.[1] || 'Bokförd transaktion';

      if (parsedEntries.length > 0) {
        const sessionId = `${userId}_${Date.now()}`;
        let response = await handleFunctionCall('save_general_transaction', {
          description: parsedDesc,
          entries: parsedEntries,
          transactionDate: parsedDate,
        }, supabase, sessionId);
        if (!response) response = '✅ Transaktionen är bokförd!';

        const templateNameMatch = lastProposal.content.match(/tolkar det som \*\*(.+?)\*\*/);
        if (templateNameMatch) {
          response += await this.getFollowUpSuggestion(templateNameMatch[1], supabase, userData);
        }
        return { response, action_taken: 'booked' };
      }

      // Freeform proposal confirmation
      const isFreeform = lastProposal.content.includes('utan mall');
      if (isFreeform) {
        const lastUserBooking = [...conversationHistory].reverse().find(
          (msg: ConversationMessage) => msg.sender === 'user' && msg.content !== message
        );
        if (lastUserBooking) {
          const fullContext = buildBookkeepingContext(userData);
          const response = await this.executeFreeformBooking(lastUserBooking.content, conversationHistory, fullContext, aiConfig, supabase, userId, systemPrompt);
          return { response: response || '✅ Transaktionen är bokförd!', action_taken: 'booked' };
        }
        return { response: 'Jag kunde inte hitta den tidigare transaktionen. Kan du upprepa vad du vill bokföra?', action_taken: 'clarified' };
      }

      // Legacy template-based confirmation
      const lastUserBooking = [...conversationHistory].reverse().find(
        (msg: ConversationMessage) => msg.sender === 'user' && msg.content !== message
      );
      if (lastUserBooking) {
        const templateNames = buildLightContext(userData);
        const originalIntent = await classifyIntent(lastUserBooking.content, templateNames, aiConfig);
        if (originalIntent.matched_template_hint && originalIntent.extracted_data.amount) {
          const sessionId = `${userId}_${Date.now()}`;
          const args = {
            templateName: originalIntent.matched_template_hint,
            amount: originalIntent.extracted_data.amount,
            description: originalIntent.extracted_data.description || originalIntent.extracted_data.vendor || '',
            transactionDate: originalIntent.extracted_data.date || new Date().toISOString().split('T')[0],
            referenceNumber: originalIntent.extracted_data.reference || undefined,
          };
          let response = await handleFunctionCall('use_transaction_template', args, supabase, sessionId);
          if (!response) response = '✅ Transaktionen är bokförd!';
          response += await this.getFollowUpSuggestion(originalIntent.matched_template_hint, supabase, userData);
          return { response, action_taken: 'booked' };
        }
        return { response: 'Jag kunde inte hitta den tidigare transaktionen. Kan du upprepa vad du vill bokföra?', action_taken: 'clarified' };
      }
      return { response: 'Jag hittar ingen tidigare transaktion att bekräfta. Vad vill du bokföra?', action_taken: 'clarified' };
    }

    return { response: 'Det finns ingen pågående bokning att bekräfta. Beskriv vad du vill bokföra.', action_taken: 'clarified' };
  }

  private async handleBooking(ctx: AgentContext): Promise<AgentResult> {
    const { message, conversationHistory, intent, userData, aiConfig, supabase, userId, systemPrompt } = ctx;

    const d = intent.extracted_data;
    const hasEnoughData = d.amount || d.vendor || d.description;

    if (!hasEnoughData) {
      const fieldContext = this.extractFieldContext(conversationHistory);
      if (!fieldContext) {
        return { response: formatMissingDataPrompt(intent.intent), action_taken: 'clarified' };
      }
    }

    // Check previous AI message for template context
    if (!intent.matched_template_hint && conversationHistory?.length) {
      const lastAiMsg = [...conversationHistory].reverse().find(
        (msg: ConversationMessage) => msg.sender === 'ai'
      );
      if (lastAiMsg) {
        const fieldMarker = lastAiMsg.content.match(/<!-- field:(\w+) template:(.+?) -->/);
        if (fieldMarker) {
          intent.matched_template_hint = fieldMarker[2];
        } else {
          const templateMatch = lastAiMsg.content.match(/Jag hittade mallen \*\*(.+?)\*\*/);
          if (templateMatch) intent.matched_template_hint = templateMatch[1];
        }
      }
    }

    const match = await matchTemplate(intent, supabase, userId);

    if (intent.clarification_needed && !intent.extracted_data.amount) {
      return { response: formatClarificationRequest(intent.clarification_needed), action_taken: 'clarified' };
    }

    if (match) {
      const requiredFields = match.template.required_fields as any[] | null;
      const fieldResult = analyzeRequiredFields(requiredFields, intent.extracted_data, conversationHistory, match.template.template_name, message);

      if (!fieldResult.complete) {
        return { response: `❓ ${fieldResult.nextQuestion}`, action_taken: 'clarified' };
      }

      const calculatedAmounts = calculateTemplateAmounts(match.template.template_entries || [], requiredFields, fieldResult.fieldValues);
      const date = (fieldResult.fieldValues.date as string) || intent.extracted_data.date || new Date().toISOString().split('T')[0];
      const desc = intent.extracted_data.description || intent.extracted_data.vendor || match.template.template_name;
      const totalAmount = calculatedAmounts.reduce((sum, a) => sum + a, 0) / 2;
      return { response: formatBookingProposal(match, totalAmount, date, desc, calculatedAmounts), action_taken: 'proposed' };
    }

    // No template — freeform
    const fullContext = buildBookkeepingContext(userData);
    const response = await this.handleFreeformBooking(message, conversationHistory, fullContext, aiConfig, supabase, userId, systemPrompt);
    return { response, action_taken: 'proposed' };
  }

  // --- Private helpers ---

  private extractFieldContext(conversationHistory: ConversationMessage[] | undefined): string | null {
    if (!conversationHistory?.length) return null;
    const lastAiMsg = [...conversationHistory].reverse().find(
      (msg: ConversationMessage) => msg.sender === 'ai'
    );
    if (lastAiMsg && lastAiMsg.content.includes('<!-- field:')) {
      const match = lastAiMsg.content.match(/<!-- field:\w+ template:(.+?) -->/);
      return match ? match[1] : null;
    }
    return null;
  }

  private async getFollowUpSuggestion(templateName: string, supabase: any, userData: any): Promise<string> {
    try {
      const { data: bookedTemplate } = await supabase
        .from('airledger_transaction_templates')
        .select('follow_up_templates')
        .eq('template_name', templateName)
        .single();
      if (!bookedTemplate?.follow_up_templates?.length) return '';
      const followUpName = bookedTemplate.follow_up_templates[0];
      const { data: followUp } = await supabase
        .from('airledger_transaction_templates')
        .select('template_name, description, template_entries')
        .eq('template_name', followUpName)
        .single();
      if (!followUp) return '';
      return formatFollowUpSuggestion(followUp, userData?.accountBalances);
    } catch { return ''; }
  }

  private async handleFullAICall(
    message: string, conversationHistory: ConversationMessage[] | undefined,
    context: string, aiConfig: any, systemPrompt: string
  ): Promise<string> {
    const messages = this.buildMessages(message, conversationHistory, context, systemPrompt);
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

  private async handleFreeformBooking(
    message: string, conversationHistory: ConversationMessage[] | undefined,
    context: string, aiConfig: any, supabase: any, userId: string, systemPrompt: string
  ): Promise<string> {
    const dynamicPrompt = await getAgentPrompt('booking', supabase, BOOKING_PROMPT);
    const freeformPrompt = `${dynamicPrompt}\n\nBOKFÖRINGSKONTEXT:\n${context}\n\nVIKTIGT: Ingen passande mall finns. Använd save_general_transaction. Visa posterna och be om bekräftelse FÖRST.`;
    const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: freeformPrompt }];
    if (conversationHistory?.length) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    try {
      const data = await aiComplete(aiConfig, { messages, max_tokens: 1500, temperature: 0.2, tools: FUNCTION_DEFINITIONS, tool_choice: 'auto' });
      const toolCalls = getToolCalls(data);
      if (toolCalls.length > 0) {
        const fnName = toolCalls[0].function?.name;
        const fnArgs = JSON.parse(toolCalls[0].function?.arguments || '{}');
        if (fnName === 'save_general_transaction') {
          const entries = fnArgs.entries || [];
          let proposal = `📋 **Bokföringsförslag (utan mall):**\n\n**${fnArgs.description}**\nDatum: ${fnArgs.transactionDate || new Date().toISOString().split('T')[0]}\n\n`;
          for (const entry of entries) {
            if (entry.debitAmount > 0) proposal += `• Debet: ${entry.accountCode} ${entry.accountName} — ${entry.debitAmount} kr\n`;
            if (entry.creditAmount > 0) proposal += `• Kredit: ${entry.accountCode} ${entry.accountName} — ${entry.creditAmount} kr\n`;
          }
          proposal += `\nSvara **"ja"** för att bokföra.`;
          return proposal;
        }
        const sessionId = `${userId}_${Date.now()}`;
        return await handleFunctionCall(fnName, fnArgs, supabase, sessionId);
      }
      return getContent(data) || 'Jag kunde inte skapa ett bokföringsförslag.';
    } catch {
      return 'Ett fel uppstod vid bokföringsförslaget. Försök igen.';
    }
  }

  private async executeFreeformBooking(
    originalMessage: string, conversationHistory: ConversationMessage[] | undefined,
    context: string, aiConfig: any, supabase: any, userId: string, systemPrompt: string
  ): Promise<string> {
    const dynamicPrompt2 = await getAgentPrompt('booking', supabase, BOOKING_PROMPT);
    const prompt = `${dynamicPrompt2}\n\nBOKFÖRINGSKONTEXT:\n${context}\n\nVIKTIGT: Användaren har BEKRÄFTAT. Använd save_general_transaction. Debet = Kredit.`;
    const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: prompt }];
    if (conversationHistory?.length) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content });
      }
    }
    try {
      const data = await aiComplete(aiConfig, { messages, max_tokens: 1500, temperature: 0.1, tools: FUNCTION_DEFINITIONS, tool_choice: { type: 'function', function: { name: 'save_general_transaction' } } });
      const toolCalls = getToolCalls(data);
      if (toolCalls.length > 0 && toolCalls[0].function?.name === 'save_general_transaction') {
        const fnArgs = JSON.parse(toolCalls[0].function.arguments || '{}');
        const sessionId = `${userId}_${Date.now()}`;
        return await handleFunctionCall('save_general_transaction', fnArgs, supabase, sessionId);
      }
      return getContent(data) || '❌ Kunde inte skapa transaktionen.';
    } catch { return '❌ Ett fel uppstod vid bokföringen. Försök igen.'; }
  }

  private parseProposalEntries(proposalContent: string): Array<{ accountCode: string; accountName: string; debitAmount: number; creditAmount: number }> {
    const entries: Array<{ accountCode: string; accountName: string; debitAmount: number; creditAmount: number }> = [];
    const tableRows = proposalContent.match(/\|\s*(\d{4})\s+(.+?)\s*\|\s*([\d\s]*(?:kr)?)\s*\|\s*([\d\s]*(?:kr)?)\s*\|/g);
    if (!tableRows) return entries;
    for (const row of tableRows) {
      const match = row.match(/\|\s*(\d{4})\s+(.+?)\s*\|\s*([\d\s,\.]*(?:kr)?)\s*\|\s*([\d\s,\.]*(?:kr)?)\s*\|/);
      if (!match) continue;
      const debitStr = match[3].replace(/\s/g, '').replace(/kr$/i, '').replace(',', '.').trim();
      const creditStr = match[4].replace(/\s/g, '').replace(/kr$/i, '').replace(',', '.').trim();
      const debit = debitStr ? parseFloat(debitStr) || 0 : 0;
      const credit = creditStr ? parseFloat(creditStr) || 0 : 0;
      if (debit === 0 && credit === 0) continue;
      entries.push({ accountCode: match[1], accountName: match[2].trim(), debitAmount: debit, creditAmount: credit });
    }
    return entries;
  }

  private buildMessages(message: string, conversationHistory: ConversationMessage[] | undefined, context: string, systemPrompt: string) {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: `${systemPrompt}\n\nBOKFÖRINGSKONTEXT:\n${context}` },
    ];
    if (conversationHistory?.length) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });
    return messages;
  }
}
