import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

import { ConversationMessage } from './types.ts';
import { authenticateUser } from './auth.ts';
import { fetchUserData } from './data-fetcher.ts';
import { buildLightContext, buildBookkeepingContext } from './context-builder.ts';
import { classifyIntent } from './intent-classifier.ts';
import { matchTemplate, getTopTemplateCandidates } from './template-matcher.ts';
import { formatBookingProposal, formatClarificationRequest, formatTemplateChoices, formatConfirmation } from './response-formatter.ts';
import { handleFunctionCall } from './function-handlers.ts';
import { SYSTEM_PROMPT } from './system-prompt.ts';

// Quota helper
const TIER_LIMITS: Record<string, { ai_analyses: number }> = {
  free: { ai_analyses: 50 },
  premium: { ai_analyses: 500 },
  professional: { ai_analyses: -1 },
};

async function checkAndUpdateQuota(
  userId: string,
  supabase: any,
  increment: boolean = false
): Promise<{ allowed: boolean; subscription_tier: string; usage: any }> {
  try {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single();

    const tier = subscriber?.subscription_tier || 'free';
    const limits = TIER_LIMITS[tier];

    let { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();

    if (!usage) {
      const { data: newUsage, error } = await supabase
        .from('usage_tracking')
        .insert({ user_id: userId, month_year: monthYear, ai_analyses_used: 0, storage_used_mb: 0 })
        .select()
        .single();
      if (error) return { allowed: false, subscription_tier: tier, usage: null };
      usage = newUsage;
    }

    const current = usage.ai_analyses_used || 0;
    const allowed = limits.ai_analyses === -1 || current < limits.ai_analyses;

    if (!allowed && increment) return { allowed: false, subscription_tier: tier, usage };

    if (increment && allowed) {
      await supabase
        .from('usage_tracking')
        .update({ ai_analyses_used: current + 1, updated_at: new Date().toISOString() })
        .eq('id', usage.id);
      usage.ai_analyses_used = current + 1;
    }

    return { allowed, subscription_tier: tier, usage };
  } catch (error) {
    console.error('Quota check error:', error);
    return { allowed: false, subscription_tier: 'free', usage: null };
  }
}

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

    // Fetch user data
    const userData = await fetchUserData(userId, supabase);
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
        // Deterministic template matching
        const match = await matchTemplate(intent, supabase, userId);

        if (intent.clarification_needed && !intent.extracted_data.amount) {
          aiResponse = formatClarificationRequest(intent.clarification_needed);
        } else if (match) {
          const amount = intent.extracted_data.amount || 0;
          const date = intent.extracted_data.date || new Date().toISOString().split('T')[0];
          const desc = intent.extracted_data.description || intent.extracted_data.vendor || match.template.template_name;
          aiResponse = formatBookingProposal(match, amount, date, desc);
        } else {
          // No match — show top candidates
          const candidates = getTopTemplateCandidates(userData.templates || [], intent);
          if (candidates.length > 0) {
            aiResponse = formatTemplateChoices(candidates);
          } else {
            aiResponse = formatClarificationRequest('Jag kunde inte hitta en passande mall. Kan du beskriva transaktionen mer detaljerat?');
          }
        }
        break;
      }

      case 'confirm_booking': {
        // Delegate to existing function handlers for execution
        // The confirmation flow is handled by the frontend TransactionConfirmDialog
        aiResponse = '✅ Jag bokför transaktionen nu...';
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
        aiResponse = await handleFullAICall(message, conversationHistory, fullContext, lovableApiKey);
        break;
      }

      case 'analyze_image': {
        aiResponse = '📸 Skicka bilden så analyserar jag den åt dig!';
        break;
      }

      default: {
        const fullContext = buildBookkeepingContext(userData);
        aiResponse = await handleFullAICall(message, conversationHistory, fullContext, lovableApiKey);
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
 * Full AI call for questions, reports, and unknown intents.
 * Uses Lovable AI Gateway with streaming disabled (non-streaming for now).
 */
async function handleFullAICall(
  message: string,
  conversationHistory: ConversationMessage[] | undefined,
  context: string,
  apiKey: string
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\nBOKFÖRINGSKONTEXT:\n${context}` },
  ];

  if (conversationHistory?.length) {
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  messages.push({ role: 'user', content: message });

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return '⚠️ AI-tjänsten är tillfälligt överbelastad. Försök igen om en stund.';
      }
      if (response.status === 402) {
        return '⚠️ AI-krediter slut. Kontakta support.';
      }
      const errText = await response.text();
      console.error('Full AI call error:', response.status, errText);
      return 'Jag kunde tyvärr inte svara just nu. Försök igen.';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Jag förstod inte riktigt. Kan du omformulera?';
  } catch (error) {
    console.error('Full AI call failed:', error);
    return 'Ett fel uppstod. Försök igen.';
  }
}
