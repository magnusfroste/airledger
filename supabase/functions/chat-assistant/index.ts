import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

import { ConversationMessage } from './types.ts';
import { authenticateUser } from './auth.ts';
import { fetchUserData } from './data-fetcher.ts';
import { buildLightContext } from './context-builder.ts';
import { classifyIntent } from './intent-classifier.ts';
import { getSystemPrompt } from './system-prompt.ts';
import { checkAndUpdateQuota, TIER_LIMITS } from '../_shared/quota.ts';
import { getAIConfig } from '../_shared/ai-client.ts';
import { routeToAgent } from './agents/registry.ts';
import { AgentContext } from './agents/types.ts';
import { logAgentExecution } from './agents/logger.ts';

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

    console.log('[Orchestrator] Message received');

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

    // Load AI config and quota in parallel
    const [aiConfig, quotaCheck] = await Promise.all([
      getAIConfig(serviceSupabase),
      checkAndUpdateQuota(userId, serviceSupabase, true),
    ]);

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

    // Fetch user data and system prompt in parallel
    const [userData, livePrompt] = await Promise.all([
      fetchUserData(userId, supabase),
      getSystemPrompt(serviceSupabase),
    ]);

    const templateNames = buildLightContext(userData);

    // === INTENT CLASSIFICATION ===
    console.log('[Orchestrator] Classifying intent...');
    const intent = await classifyIntent(message, templateNames, aiConfig);
    console.log(`[Orchestrator] Intent: ${intent.intent}, confidence: ${intent.confidence}`);

    // === CONTEXT DETECTION: Year-end guided flow ===
    const isYearEndContext = detectYearEndContext(conversationHistory);
    if (isYearEndContext && !message.match(/^(boka |bokför |köpt |betala |faktura )/i)) {
      console.log('[Orchestrator] Year-end context → reporting agent');
      intent.intent = 'year_end';
    }

    // === CONTEXT DETECTION: Field collection ===
    const activeFieldContext = extractFieldContext(conversationHistory);
    if (activeFieldContext && !intent.matched_template_hint) {
      const isSimpleAnswer = message.trim().split(/\s+/).length <= 5 || parseSimpleAmount(message) !== null;
      if (isSimpleAnswer) {
        console.log('[Orchestrator] Resuming field collection:', activeFieldContext);
        if (!['book_expense', 'book_sale', 'book_payment', 'confirm_booking'].includes(intent.intent)) {
          intent.intent = 'book_expense';
        }
        intent.matched_template_hint = activeFieldContext;
        const parsedAmount = parseSimpleAmount(message);
        if (parsedAmount !== null) {
          intent.extracted_data.amount = parsedAmount;
        }
      }
    }

    // === ROUTE TO AGENT (with timing) ===
    const agentCtx: AgentContext = {
      message,
      conversationHistory,
      intent,
      userData,
      aiConfig,
      supabase,
      userId,
      systemPrompt: livePrompt,
    };

    const startTime = performance.now();
    let result;
    let agentSuccess = true;
    let agentError: string | undefined;

    try {
      result = await routeToAgent(agentCtx);
    } catch (err) {
      agentSuccess = false;
      agentError = (err as Error).message || 'Unknown error';
      throw err;
    } finally {
      const elapsed = Math.round(performance.now() - startTime);
      const agentName = intent.intent.startsWith('book_') || intent.intent === 'confirm_booking' || intent.intent === 'opening_balance'
        ? 'booking'
        : ['vat_report', 'account_balance', 'period_reconciliation', 'year_end', 'view_report'].includes(intent.intent)
          ? 'reporting'
          : 'advisory';

      // Log asynchronously — don't block response
      logAgentExecution(serviceSupabase, {
        userId,
        agentName,
        intent: intent.intent,
        executionTimeMs: elapsed,
        actionTaken: result?.action_taken,
        success: agentSuccess,
        errorMessage: agentError,
      }).catch(console.error);

      console.log(`[Orchestrator] ${agentName} completed in ${elapsed}ms`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: result.response,
        intent: intent.intent,
        confidence: intent.confidence,
        action_taken: result.action_taken,
        context_used: true,
        quota_info: {
          subscription_tier: quotaCheck.subscription_tier,
          usage: quotaCheck.usage,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Ett oväntat fel uppstod', success: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// --- Orchestrator helpers ---

function detectYearEndContext(conversationHistory: ConversationMessage[] | undefined): boolean {
  if (!conversationHistory?.length) return false;
  const lastAiMsg = [...conversationHistory].reverse().find(
    (msg: ConversationMessage) => msg.sender === 'ai'
  );
  if (!lastAiMsg) return false;
  return lastAiMsg.content.includes('årsbokslut') ||
    lastAiMsg.content.includes('Checklista') ||
    lastAiMsg.content.includes('bokslutet steg') ||
    lastAiMsg.content.includes('Avskrivningar') ||
    lastAiMsg.content.includes('Periodiseringar') ||
    lastAiMsg.content.includes('Skatteavsättning') ||
    lastAiMsg.content.includes('Bokslutssammanfattning');
}

function extractFieldContext(conversationHistory: ConversationMessage[] | undefined): string | null {
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

function parseSimpleAmount(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(/kr$/i, '').replace(/SEK$/i, '').trim();
  const match = cleaned.match(/^-?[\d]+([.,]\d+)?$/);
  if (match) return parseFloat(cleaned.replace(',', '.'));
  return null;
}
