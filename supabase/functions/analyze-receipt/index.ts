import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { getAIConfig, aiComplete, getContent } from '../_shared/ai-client.ts'

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
    console.log('=== ANALYZE RECEIPT FUNCTION STARTED ===')
    
    const { imageBase64 } = await req.json()
    console.log('Image data received, length:', imageBase64?.length || 0)

    if (!imageBase64) {
      throw new Error('Image data is required')
    }

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Load AI config
    const aiConfig = await getAIConfig(serviceSupabase);

    console.log('Calling AI Vision API via provider:', aiConfig.provider);

    const systemContent = `You are a Swedish bookkeeping assistant. Analyze the receipt/invoice image and extract key information to propose bookkeeping transactions.

IMPORTANT: Try to determine if this is a RECEIPT (already paid) or INVOICE (unpaid) by looking for visual clues:
- RECEIPTS often show: "BETALT", "TACK FÖR KÖPET", transaction time, card payment confirmation
- INVOICES often show: "FÖRFALLODATUM", "ATT BETALA", "FAKTURA", bankgiro/postgiro numbers

Return a JSON object with this exact structure:
{
  "vendor": "Company name",
  "date": "YYYY-MM-DD",
  "total_amount": 123.45,
  "net_amount": 98.76,
  "vat_amount": 24.69,
  "vat_rate": 25,
  "description": "Brief description",
  "document_type": "receipt|invoice",
  "document_type_confidence": 85,
  "transaction_type": "expense",
  "suggested_payment_method": "bank|cash|expense|unpaid",
  "entries": [
    {
      "account_code": "6000",
      "account_name": "Kontorsmaterial",
      "debit_amount": 98.76,
      "credit_amount": 0,
      "description": "Kontorsmaterial från leverantör (exkl. moms)"
    },
    {
      "account_code": "2641",
      "account_name": "Ingående moms",
      "debit_amount": 24.69,
      "credit_amount": 0,
      "description": "Ingående moms 25%"
    },
    {
      "account_code": "1930",
      "account_name": "Checkkonto",
      "debit_amount": 0,
      "credit_amount": 123.45,
      "description": "Betalning via bank/kort"
    }
  ],
  "confidence": 85
}

IMPORTANT: Always extract VAT information from Swedish receipts/invoices:
- Look for "MOMS", "MVA", "VAT" on the document
- Swedish VAT rates: 25% (standard), 12% (food/transport), 6% (books/newspapers), 0% (exports)
- Calculate net_amount = total_amount / (1 + vat_rate/100)
- Calculate vat_amount = total_amount - net_amount
- Use account 2641 for "Ingående moms" (input VAT)
- If no VAT visible, assume 25% and calculate backwards from total

Use Swedish accounting plan (BAS 2024) account codes.
Ensure entries balance (total debits = total credits)!`;

    // Call AI via abstraction layer
    const aiResult = await aiComplete(aiConfig, {
      model: aiConfig.visionModel,
      messages: [
        { role: 'system', content: systemContent },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this Swedish receipt and propose bookkeeping entries:' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    console.log('AI API call successful');
    const analysisText = getContent(aiResult);
    console.log('Analysis result length:', analysisText?.length || 0);

    let analysis
    try {
      let cleanedText = analysisText || '{}'
      
      if (cleanedText.includes('```json')) {
        cleanedText = cleanedText.replace(/```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```\s*/, '').replace(/\s*```$/, '')
      }
      
      analysis = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw response:', analysisText)
      throw new Error('Failed to parse receipt analysis - AI returned invalid JSON')
    }

    // Validate required fields
    if (!analysis.vendor || !analysis.date || !analysis.total_amount || !analysis.entries) {
      console.error('Missing required fields:', {
        vendor: !!analysis.vendor,
        date: !!analysis.date,
        total_amount: !!analysis.total_amount,
        entries: !!analysis.entries
      })
      throw new Error('Incomplete analysis data from OpenAI')
    }

    // Validate that entries balance
    const totalDebits = analysis.entries.reduce((sum: number, entry: any) => sum + (entry.debit_amount || 0), 0)
    const totalCredits = analysis.entries.reduce((sum: number, entry: any) => sum + (entry.credit_amount || 0), 0)
    
    console.log('Balance check:', { totalDebits, totalCredits })
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      console.error('Entries do not balance:', { totalDebits, totalCredits })
      throw new Error('Bookkeeping entries do not balance')
    }

    console.log('=== ANALYZE RECEIPT FUNCTION COMPLETED SUCCESSFULLY ===')

    // Return analysis for user confirmation - don't save yet
    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysis,
        user_id: userId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN ANALYZE RECEIPT FUNCTION ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
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