import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import OpenAI from 'https://esm.sh/openai@4.20.1'

import { ConversationMessage } from './types.ts';
import { authenticateUser } from './auth.ts';
import { fetchUserData } from './data-fetcher.ts';
import { buildBookkeepingContext } from './context-builder.ts';
import { handleFunctionCall } from './function-handlers.ts';
import { SYSTEM_PROMPT, FUNCTION_DEFINITIONS } from './openai-config.ts';
// Quota helper functions inlined
const TIER_LIMITS: Record<string, { ai_analyses: number; storage_mb: number }> = {
  free: { ai_analyses: 50, storage_mb: 500 },
  premium: { ai_analyses: 500, storage_mb: 5000 },
  professional: { ai_analyses: -1, storage_mb: 50000 } // -1 means unlimited
};

async function checkAndUpdateQuota(
  userId: string, 
  supabase: any,
  incrementAiAnalyses: boolean = false
): Promise<{ allowed: boolean; subscription_tier: string; usage: any }> {
  try {
    // Get current month-year
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get user subscription
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single();

    const subscriptionTier = subscriber?.subscription_tier || 'free';
    const limits = TIER_LIMITS[subscriptionTier];

    // Get or create usage record
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();

    let currentUsage = usage;
    if (!currentUsage) {
      // Create new usage record
      const { data: newUsage, error: createError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          month_year: monthYear,
          ai_analyses_used: 0,
          storage_used_mb: 0
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating usage record:', createError);
        return { allowed: false, subscription_tier: subscriptionTier, usage: null };
      }
      currentUsage = newUsage;
    }

    // Check if AI analyses are within quota
    const currentAiAnalyses = currentUsage.ai_analyses_used || 0;
    const aiAnalysesAllowed = limits.ai_analyses === -1 || currentAiAnalyses < limits.ai_analyses;

    if (!aiAnalysesAllowed && incrementAiAnalyses) {
      return { allowed: false, subscription_tier: subscriptionTier, usage: currentUsage };
    }

    // If incrementing, update the usage
    if (incrementAiAnalyses && aiAnalysesAllowed) {
      const { error: updateError } = await supabase
        .from('usage_tracking')
        .update({ 
          ai_analyses_used: currentAiAnalyses + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUsage.id);

      if (updateError) {
        console.error('Error updating usage:', updateError);
        return { allowed: false, subscription_tier: subscriptionTier, usage: currentUsage };
      }
      
      // Update current usage for return
      currentUsage.ai_analyses_used = currentAiAnalyses + 1;
    }

    return { 
      allowed: aiAnalysesAllowed, 
      subscription_tier: subscriptionTier, 
      usage: currentUsage 
    };

  } catch (error) {
    console.error('Error in quota check:', error);
    return { allowed: false, subscription_tier: 'free', usage: null };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Chat assistant function called')
    const { message, conversationHistory } = await req.json()

    if (!message) {
      throw new Error('Message is required')
    }

    console.log('Message received:', message)

    // Check if OpenAI API key is available
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not found in environment')
      throw new Error('OpenAI API key not configured')
    }

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header received')

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Authenticate user
    const userId = await authenticateUser(authHeader || '', supabase);

    // Check quota and increment usage - use service role for database operations
    const serviceSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false }
    });
    const quotaCheck = await checkAndUpdateQuota(userId, serviceSupabase, true);
    if (!quotaCheck.allowed) {
      console.log('Quota exceeded for user:', userId, 'tier:', quotaCheck.subscription_tier);
      return new Response(
        JSON.stringify({ 
          error: 'AI-analyskvoter överskridna för denna månad',
          subscription_tier: quotaCheck.subscription_tier,
          usage: quotaCheck.usage
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch user data
    const userData = await fetchUserData(userId, supabase);

    // Build context
    const bookkeepingContext = buildBookkeepingContext(userData);

    // Initialize OpenAI
    console.log('Initializing OpenAI client')
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    console.log('Processing chat message with OpenAI...')

    // Prepare conversation messages
    const messages = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}

BOKFÖRINGSKONTEXTEN:
${bookkeepingContext}`
      }
    ]

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      console.log('Adding conversation history:', conversationHistory.length, 'messages')
      conversationHistory.forEach((msg: ConversationMessage) => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    })

    console.log('Calling OpenAI API')
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 800,
      temperature: 0.3,
      tools: FUNCTION_DEFINITIONS,
      tool_choice: "auto"
    })

    console.log('OpenAI response received')
    console.log('Tool calls:', response.choices[0].message.tool_calls?.length || 0)

    let aiResponse = response.choices[0].message.content || ""
    const toolCalls = response.choices[0].message.tool_calls

    // Handle function calls
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const args = JSON.parse(toolCall.function.arguments);
        const functionResponse = await handleFunctionCall(
          toolCall.function.name, 
          args, 
          supabase
        );
        aiResponse += functionResponse;
      }
    }

    console.log('AI response generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        context_used: bookkeepingContext.length > 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in chat-assistant function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})