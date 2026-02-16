import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

import { ConversationMessage } from './types.ts';
import { authenticateUser } from './auth.ts';
import { fetchUserData } from './data-fetcher.ts';
import { buildLightContext, buildBookkeepingContext } from './context-builder.ts';
import { classifyIntent } from './intent-classifier.ts';
import { matchTemplate } from './template-matcher.ts';
import { formatBookingProposal, formatClarificationRequest, formatConfirmation, formatMissingDataPrompt, formatFollowUpSuggestion } from './response-formatter.ts';
import { buildFinancialSnapshot } from './context-builder.ts';
import { handleFunctionCall } from './function-handlers.ts';
import { SYSTEM_PROMPT, getSystemPrompt } from './system-prompt.ts';
import { FUNCTION_DEFINITIONS } from './function-definitions.ts';
import { checkAndUpdateQuota, TIER_LIMITS } from '../_shared/quota.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    if (!message) throw new Error('Message is required');

    console.log('Intent Router: message received');

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const userId = await authenticateUser(authHeader || '', supabase);

    const serviceSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    // Quota check
    const quotaCheck = await checkAndUpdateQuota(userId, serviceSupabase, true);
    if (!quotaCheck.allowed) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      const resetDate = nextMonth.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
      const limitCount = TIER_LIMITS[quotaCheck.subscription_tier]?.ai_analyses || 50;

      return new Response(
        JSON.stringify({
          success: false,
          error: `Du har använt alla dina AI-analyser (${quotaCheck.usage?.ai_analyses_used}/${limitCount}). Kvoten återställs ${resetDate}.`,
          quota_exceeded: true,
          subscription_tier: quotaCheck.subscription_tier,
          usage: quotaCheck.usage,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user data and live system prompt in parallel
    const [userData, livePrompt] = await Promise.all([
      fetchUserData(userId, supabase),
      getSystemPrompt(serviceSupabase),
    ]);
    const templateNames = buildLightContext(userData);

    // === INTENT CLASSIFICATION (lightweight AI call) ===
    console.log('Classifying intent...');
    const intent = await classifyIntent(message, templateNames, lovableApiKey);
    console.log('Intent:', intent.intent, 'confidence:', intent.confidence);

    let aiResponse = '';

    // === ROUTING ===
    switch (intent.intent) {
      case 'book_expense':
      case 'book_sale':
      case 'book_payment': {
        // Early check: if no data at all, ask the user what to book
        const d = intent.extracted_data;
        const hasEnoughData = d.amount || d.vendor || d.description;

        if (!hasEnoughData) {
          aiResponse = formatMissingDataPrompt(intent.intent);
          break;
        }

        // Deterministic template matching
        const match = await matchTemplate(intent, supabase, userId);

        if (intent.clarification_needed && !intent.extracted_data.amount) {
          aiResponse = formatClarificationRequest(intent.clarification_needed);
        } else if (match && !intent.extracted_data.amount) {
          // Template matched but no amount — ask for it instead of proposing 0 kr
          aiResponse = formatClarificationRequest(`Jag hittade mallen **${match.template.template_name}**. Vilket belopp ska bokföras?`);
        } else if (match) {
          const amount = intent.extracted_data.amount;
          const date = intent.extracted_data.date || new Date().toISOString().split('T')[0];
          const desc = intent.extracted_data.description || intent.extracted_data.vendor || match.template.template_name;
          aiResponse = formatBookingProposal(match, amount, date, desc);
        } else {
          // No template match — use full AI call with function calling
          // so the AI can create a freeform transaction via save_general_transaction
          console.log('No template match — falling back to freeform AI booking');
          const fullContext = buildBookkeepingContext(userData);
          aiResponse = await handleFreeformBooking(message, conversationHistory, fullContext, lovableApiKey, supabase, userId, livePrompt);
        }
        break;
      }

      case 'confirm_booking': {
        if (conversationHistory?.length) {
          // Check for freeform proposal first
          const lastFreeformProposal = [...(conversationHistory || [])].reverse().find(
            (msg: ConversationMessage) => msg.sender === 'ai' && msg.content.includes('Bokföringsförslag (utan mall)')
          );

          const lastUserBooking = [...(conversationHistory || [])].reverse().find(
            (msg: ConversationMessage) => msg.sender === 'user' && msg.content !== message
          );

          if (lastFreeformProposal && lastUserBooking) {
            // Re-run the freeform AI call but this time execute the function
            console.log('Confirming freeform booking...');
            const fullContext = buildBookkeepingContext(userData);
            
            // Re-classify to get the transaction data, then execute
            const freeformResult = await executeFreeformBooking(
              lastUserBooking.content, conversationHistory, fullContext, lovableApiKey, supabase, userId, livePrompt
            );
            aiResponse = freeformResult || '✅ Transaktionen är bokförd!';
          } else {
            // Template-based confirmation (existing logic)
            const lastProposal = [...(conversationHistory || [])].reverse().find(
              (msg: ConversationMessage) => msg.sender === 'ai' && msg.content.includes('Bokföringsförslag')
            );

            if (lastUserBooking) {
              const originalIntent = await classifyIntent(lastUserBooking.content, templateNames, lovableApiKey);
              
              if (originalIntent.matched_template_hint && originalIntent.extracted_data.amount) {
                const sessionId = `${userId}_${Date.now()}`;
                const args = {
                  templateName: originalIntent.matched_template_hint,
                  amount: originalIntent.extracted_data.amount,
                  description: originalIntent.extracted_data.description || originalIntent.extracted_data.vendor || '',
                  transactionDate: originalIntent.extracted_data.date || new Date().toISOString().split('T')[0],
                  referenceNumber: originalIntent.extracted_data.reference || undefined,
                };
                aiResponse = await handleFunctionCall('use_transaction_template', args, supabase, sessionId);
                if (!aiResponse) aiResponse = '✅ Transaktionen är bokförd!';

                // Check for follow-up templates
                aiResponse += await getFollowUpSuggestion(originalIntent.matched_template_hint, supabase, userData);
              } else {
                aiResponse = 'Jag kunde inte hitta den tidigare transaktionen. Kan du upprepa vad du vill bokföra?';
              }
            } else {
              aiResponse = 'Jag hittar ingen tidigare transaktion att bekräfta. Vad vill du bokföra?';
            }
          }
        } else {
          aiResponse = 'Det finns ingen pågående bokning att bekräfta. Beskriv vad du vill bokföra.';
        }
        break;
      }

      case 'opening_balance': {
        // Extract and present opening balance info
        if (intent.extracted_data.amount) {
          const sessionId = `${userId}_${Date.now()}`;
          const args = {
            accountCode: intent.extracted_data.reference || '1930',
            accountName: intent.extracted_data.description || 'Checkkonto/Bankkonto',
            amount: intent.extracted_data.amount,
          };
          aiResponse = await handleFunctionCall('save_opening_balance', args, supabase, sessionId);
        } else {
          aiResponse = formatClarificationRequest('Vilket konto och belopp vill du registrera som ingående balans?');
        }
        break;
      }

      case 'ask_question':
      case 'view_report':
      case 'unknown': {
        // Full AI call with complete context (fallback to rich conversation)
        const fullContext = buildBookkeepingContext(userData);
        aiResponse = await handleFullAICall(message, conversationHistory, fullContext, lovableApiKey, livePrompt);
        break;
      }

      case 'vat_report': {
        // Determine quarter from extracted data or current quarter
        const now = new Date();
        const q = Math.floor(now.getMonth() / 3);
        const year = now.getFullYear();
        const periodStart = intent.extracted_data.date || `${year}-${String(q * 3 + 1).padStart(2, '0')}-01`;
        const qEnd = new Date(year, q * 3 + 3, 0);
        const periodEnd = qEnd.toISOString().split('T')[0];
        
        const sessionId = `${userId}_${Date.now()}`;
        aiResponse = await handleFunctionCall('calculate_vat_report', { periodStart, periodEnd }, supabase, sessionId);
        if (!aiResponse) {
          const fullContext = buildBookkeepingContext(userData);
          aiResponse = await handleFullAICall(message, conversationHistory, fullContext, lovableApiKey, livePrompt);
        }
        break;
      }

      case 'account_balance': {
        const accountCode = intent.extracted_data.reference || '';
        if (accountCode) {
          const sessionId = `${userId}_${Date.now()}`;
          aiResponse = await handleFunctionCall('calculate_account_balance', { accountCode }, supabase, sessionId);
        } else {
          // Let AI ask which account
          const fullContext = buildBookkeepingContext(userData);
          aiResponse = await handleFullAICall(message, conversationHistory, fullContext, lovableApiKey, livePrompt);
        }
        break;
      }

      case 'period_reconciliation': {
        const accountCode = intent.extracted_data.reference || '';
        if (accountCode) {
          const sessionId = `${userId}_${Date.now()}`;
          aiResponse = await handleFunctionCall('calculate_account_balance', { 
            accountCode,
            periodStart: intent.extracted_data.date || undefined,
          }, supabase, sessionId);
        } else {
          const fullContext = buildBookkeepingContext(userData);
          aiResponse = await handleFullAICall(message, conversationHistory, fullContext, lovableApiKey, livePrompt);
        }
        break;
      }

      case 'year_end': {
        const year = intent.extracted_data.date 
          ? parseInt(intent.extracted_data.date.substring(0, 4))
          : new Date().getFullYear() - (new Date().getMonth() < 3 ? 1 : 0);
        const sessionId = `${userId}_${Date.now()}`;
        aiResponse = await handleFunctionCall('get_year_end_checklist', { fiscalYear: year }, supabase, sessionId);
        break;
      }

      case 'analyze_image': {
        aiResponse = '📸 Skicka bilden så analyserar jag den åt dig!';
        break;
      }

      default: {
        const fullContext = buildBookkeepingContext(userData);
        aiResponse = await handleFullAICall(message, conversationHistory, fullContext, lovableApiKey, livePrompt);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        intent: intent.intent,
        confidence: intent.confidence,
        context_used: true,
        quota_info: {
          subscription_tier: quotaCheck.subscription_tier,
          usage: quotaCheck.usage,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Intent Router error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Ett oväntat fel uppstod', success: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Execute a freeform booking after user confirmation.
 */
async function executeFreeformBooking(
  originalMessage: string,
  conversationHistory: ConversationMessage[] | undefined,
  context: string,
  apiKey: string,
  supabase: any,
  userId: string,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<string> {
  const freeformPrompt = `${systemPrompt}\n\nBOKFÖRINGSKONTEXT:\n${context}\n\nVIKTIGT: Användaren har BEKRÄFTAT att denna transaktion ska bokföras. Använd funktionen save_general_transaction med korrekta BAS-konton. Se till att debet = kredit.`;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: freeformPrompt },
  ];
  if (conversationHistory?.length) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content });
    }
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 1500,
        temperature: 0.1,
        tools: FUNCTION_DEFINITIONS,
        tool_choice: { type: 'function', function: { name: 'save_general_transaction' } },
      }),
    });

    if (!response.ok) {
      console.error('Execute freeform error:', response.status);
      return '❌ Kunde inte genomföra bokföringen. Försök igen.';
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.name === 'save_general_transaction') {
      const fnArgs = JSON.parse(toolCall.function.arguments || '{}');
      console.log('Executing freeform transaction:', fnArgs);
      const sessionId = `${userId}_${Date.now()}`;
      return await handleFunctionCall('save_general_transaction', fnArgs, supabase, sessionId);
    }

    return data.choices?.[0]?.message?.content || '❌ Kunde inte skapa transaktionen.';
  } catch (error) {
    console.error('Execute freeform failed:', error);
    return '❌ Ett fel uppstod vid bokföringen. Försök igen.';
  }
}

/**
 * Full AI call for questions, reports, and unknown intents.
 */
async function handleFullAICall(
  message: string,
  conversationHistory: ConversationMessage[] | undefined,
  context: string,
  apiKey: string,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<string> {
  const messages = buildMessages(message, conversationHistory, context, systemPrompt);

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-3-flash-preview', messages, max_tokens: 1000, temperature: 0.3 }),
    });

    if (!response.ok) {
      if (response.status === 429) return '⚠️ AI-tjänsten är tillfälligt överbelastad. Försök igen om en stund.';
      if (response.status === 402) return '⚠️ AI-krediter slut. Kontakta support.';
      console.error('Full AI call error:', response.status, await response.text());
      return 'Jag kunde tyvärr inte svara just nu. Försök igen.';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Jag förstod inte riktigt. Kan du omformulera?';
  } catch (error) {
    console.error('Full AI call failed:', error);
    return 'Ett fel uppstod. Försök igen.';
  }
}

/**
 * Freeform booking: AI call with function calling to create transactions without templates.
 * Used when no template matches the user's booking intent.
 */
async function handleFreeformBooking(
  message: string,
  conversationHistory: ConversationMessage[] | undefined,
  context: string,
  apiKey: string,
  supabase: any,
  userId: string,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<string> {
  const freeformPrompt = `${systemPrompt}

BOKFÖRINGSKONTEXT:
${context}

VIKTIGT: Användaren vill bokföra en transaktion och det finns ingen passande mall.
Du MÅSTE använda funktionen save_general_transaction för att skapa bokföringsposterna.
Välj rätt konton från BAS-kontoplanen ovan. Se till att debet = kredit.
Visa alltid posterna för användaren och be om bekräftelse FÖRST.
Formatera förslaget tydligt med kontonummer, kontonamn och belopp.`;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: freeformPrompt },
  ];

  if (conversationHistory?.length) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content });
    }
  }
  messages.push({ role: 'user', content: message });

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 1500,
        temperature: 0.2,
        tools: FUNCTION_DEFINITIONS,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      console.error('Freeform booking AI call error:', response.status, await response.text());
      return 'Jag kunde tyvärr inte skapa bokföringsförslaget just nu. Försök igen.';
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) return 'Jag kunde inte skapa ett bokföringsförslag. Försök igen.';

    // Check if AI wants to call a function
    if (choice.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const fnName = toolCall.function?.name;
      const fnArgs = JSON.parse(toolCall.function?.arguments || '{}');

      console.log('Freeform AI chose function:', fnName, fnArgs);

      if (fnName === 'save_general_transaction') {
        // Format a proposal for the user to confirm
        const entries = fnArgs.entries || [];
        let proposal = `📋 **Bokföringsförslag (utan mall):**\n\n`;
        proposal += `**${fnArgs.description}**\n`;
        proposal += `Datum: ${fnArgs.transactionDate || new Date().toISOString().split('T')[0]}\n\n`;

        for (const entry of entries) {
          if (entry.debitAmount > 0) {
            proposal += `• Debet: ${entry.accountCode} ${entry.accountName} — ${entry.debitAmount} kr\n`;
          }
          if (entry.creditAmount > 0) {
            proposal += `• Kredit: ${entry.accountCode} ${entry.accountName} — ${entry.creditAmount} kr\n`;
          }
        }

        proposal += `\nSvara **"ja"** för att bokföra.`;

        // Store the pending transaction in conversation context
        // The confirm_booking handler will pick it up
        return proposal;
      } else {
        // Other function — delegate
        const sessionId = `${userId}_${Date.now()}`;
        return await handleFunctionCall(fnName, fnArgs, supabase, sessionId);
      }
    }

    // No function call — return the text response
    return choice.message?.content || 'Jag kunde inte skapa ett bokföringsförslag.';
  } catch (error) {
    console.error('Freeform booking failed:', error);
    return 'Ett fel uppstod vid bokföringsförslaget. Försök igen.';
  }
}

function buildMessages(message: string, conversationHistory: ConversationMessage[] | undefined, context: string, systemPrompt: string = SYSTEM_PROMPT) {
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

/**
 * Look up follow-up templates for a just-booked template and format suggestions.
 */
async function getFollowUpSuggestion(
  templateName: string,
  supabase: any,
  userData: any
): Promise<string> {
  try {
    // Fetch the booked template to check for follow_up_templates
    const { data: bookedTemplate } = await supabase
      .from('airledger_transaction_templates')
      .select('follow_up_templates')
      .eq('template_name', templateName)
      .single();

    if (!bookedTemplate?.follow_up_templates?.length) return '';

    // Fetch the follow-up template details
    const followUpName = bookedTemplate.follow_up_templates[0];
    const { data: followUp } = await supabase
      .from('airledger_transaction_templates')
      .select('template_name, description, template_entries')
      .eq('template_name', followUpName)
      .single();

    if (!followUp) return '';

    return formatFollowUpSuggestion(followUp, userData?.accountBalances);
  } catch (err) {
    console.error('Follow-up suggestion error:', err);
    return '';
  }
}
