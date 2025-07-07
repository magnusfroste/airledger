import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Voice-to-text function called')

    // Create Supabase client for quota checking
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header provided')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) {
      throw new Error('User not authenticated')
    }

    // Check quota and increment usage
    const quotaCheck = await checkAndUpdateQuota(userData.user.id, supabase, true);
    if (!quotaCheck.allowed) {
      console.log('Quota exceeded for user:', userData.user.id, 'tier:', quotaCheck.subscription_tier);
      return new Response(
        JSON.stringify({ 
          success: false,
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

    const { audio } = await req.json()
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log('Converting base64 audio to binary')
    // Convert base64 to binary
    const binaryString = atob(audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Prepare form data for OpenAI Whisper
    const formData = new FormData()
    const blob = new Blob([bytes], { type: 'audio/webm' })
    formData.append('file', blob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', 'sv') // Swedish language

    console.log('Sending to OpenAI Whisper API')
    // Send to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const result = await response.json()
    console.log('Transcription result:', result.text)

    return new Response(
      JSON.stringify({ 
        success: true,
        text: result.text 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in voice-to-text function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})