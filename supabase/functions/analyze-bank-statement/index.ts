import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Quota helper (same as analyze-receipt)
const TIER_LIMITS: Record<string, { ai_analyses: number }> = {
  free: { ai_analyses: 50 },
  premium: { ai_analyses: 500 },
  professional: { ai_analyses: -1 },
};

async function checkAndUpdateQuota(userId: string, supabase: any): Promise<{ allowed: boolean; subscription_tier: string; usage: any }> {
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
    const { data: newUsage } = await supabase
      .from('usage_tracking')
      .insert({ user_id: userId, month_year: monthYear, ai_analyses_used: 0, storage_used_mb: 0 })
      .select()
      .single();
    usage = newUsage;
  }

  const current = usage?.ai_analyses_used || 0;
  const allowed = limits.ai_analyses === -1 || current < limits.ai_analyses;

  if (allowed) {
    await supabase
      .from('usage_tracking')
      .update({ ai_analyses_used: current + 1, updated_at: new Date().toISOString() })
      .eq('id', usage.id);
  }

  return { allowed, subscription_tier: tier, usage };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error('Image data is required');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('AI API key not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Auth
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    let userId: string;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
      if (!userId) throw new Error('Authentication failed');
    } else {
      userId = user.id;
    }

    // Quota check
    const serviceSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const quota = await checkAndUpdateQuota(userId, serviceSupabase);
    if (!quota.allowed) {
      return new Response(
        JSON.stringify({ error: 'AI-analyskvoter överskridna', success: false, subscription_tier: quota.subscription_tier, usage: quota.usage }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI Gateway with vision model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `Du är en svensk bokföringsassistent. Analysera bilden av ett bankutdrag/kontoutdrag och extrahera ALLA transaktioner du kan se.

Returnera ett JSON-objekt med denna exakta struktur:
{
  "bank_name": "Bankens namn",
  "account_number": "Kontonummer om synligt",
  "period": "Period som utdraget täcker",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Beskrivning av transaktionen",
      "amount": 1234.56,
      "type": "expense|income",
      "suggested_category": "Kategori",
      "suggested_account_code": "6000",
      "suggested_account_name": "Kontonamn",
      "counterpart_account_code": "1930",
      "counterpart_account_name": "Bankkonto",
      "vat_applicable": true,
      "vat_rate": 25,
      "confidence": 85
    }
  ],
  "total_transactions": 12,
  "summary": "Kort sammanfattning"
}

REGLER:
- Extrahera VARJE rad/transaktion du ser i utdraget
- Positiva belopp = inkomst (insättning), negativa = utgift (uttag)
- Använd BAS 2024 kontokoder:
  - 1930: Bankkonto (motkonto för alla)
  - 6000-serien: Diverse rörelsekostnader
  - 3000-serien: Intäkter
  - 2641: Ingående moms
- Gissa bästa kontokod baserat på beskrivningen
- Om du ser "Swish", "Överföring", "Lön" etc, använd rätt konton
- Belopp ska vara absoluta värden (positiva), type anger riktning
- Sortera kronologiskt efter datum`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analysera detta bankutdrag och extrahera alla transaktioner:' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', errText);
      throw new Error('AI analysis failed');
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || '{}';

    // Parse JSON from response - robust extraction
    let cleaned = rawContent;
    // Extract JSON from markdown code blocks
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim();
    } else {
      // Try to find raw JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
    }

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Raw content (first 500 chars):', rawContent.substring(0, 500));
      throw new Error('Kunde inte tolka AI-svaret. Försök igen.');
    }

    if (!analysis.transactions || !Array.isArray(analysis.transactions) || analysis.transactions.length === 0) {
      throw new Error('Inga transaktioner hittades i bilden');
    }

    console.log(`Extracted ${analysis.transactions.length} transactions from bank statement`);

    return new Response(
      JSON.stringify({ success: true, analysis, user_id: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-bank-statement:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred', success: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
