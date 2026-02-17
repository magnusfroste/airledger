import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { checkAndUpdateQuota } from '../_shared/quota.ts';
import { fetchUserData } from '../_shared/data-fetcher.ts';
import { buildFinancialSnapshot } from '../_shared/context-builder.ts';
import { matchSingleTransaction, applyTemplateToTransaction } from '../_shared/template-matcher.ts';
import { BankTransaction } from '../_shared/types.ts';
import { getAIConfig, aiComplete, getContent } from '../_shared/ai-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Service client for privileged operations
    const serviceSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Load AI provider config
    const aiConfig = await getAIConfig(serviceSupabase);

    // Quota check
    const quota = await checkAndUpdateQuota(userId, serviceSupabase, true);
    if (!quota.allowed) {
      return new Response(
        JSON.stringify({ error: 'AI-analyskvoter överskridna', success: false, subscription_tier: quota.subscription_tier, usage: quota.usage }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user data + financial snapshot for context-aware AI prompt
    const userData = await fetchUserData(userId, serviceSupabase);
    const financialSnapshot = buildFinancialSnapshot(userData);

    // Build context-aware system prompt
    const systemPrompt = buildBankStatementPrompt(financialSnapshot);

    // Call AI with vision model via abstraction layer
    const aiResult = await aiComplete(aiConfig, {
      model: aiConfig.visionModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analysera detta bankutdrag och extrahera alla transaktioner:' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 16000,
      temperature: 0.1,
    });
    const rawContent = aiResult.choices?.[0]?.message?.content || '{}';

    // Parse JSON from response
    let cleaned = rawContent;
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim();
    } else {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];
    }

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('JSON parse error:', (parseError as Error).message);
      console.error('Raw content (first 500 chars):', rawContent.substring(0, 500));
      throw new Error('Kunde inte tolka AI-svaret. Försök igen.');
    }

    if (!analysis.transactions || !Array.isArray(analysis.transactions) || analysis.transactions.length === 0) {
      throw new Error('Inga transaktioner hittades i bilden');
    }

    console.log(`Extracted ${analysis.transactions.length} transactions from bank statement`);

    // Post-process: match each transaction against template library using shared matcher
    const templates = userData.templates || [];
    if (templates.length > 0) {
      for (const tx of analysis.transactions) {
        const result = matchSingleTransaction(tx as BankTransaction, templates);
        if (result) {
          tx._matched_template = result.template.template_name;
          applyTemplateToTransaction(tx, result.template);
        }
      }
      console.log(`Template matching complete for ${analysis.transactions.length} transactions`);
    }

    return new Response(
      JSON.stringify({ success: true, analysis, user_id: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-bank-statement:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'An unexpected error occurred', success: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Build a context-aware system prompt for bank statement analysis.
 * Includes financial snapshot so AI can interpret ambiguous transactions.
 */
function buildBankStatementPrompt(financialSnapshot: string): string {
  let prompt = `Du är en svensk bokföringsassistent. Analysera bilden av ett bankutdrag/kontoutdrag och extrahera ALLA transaktioner du kan se.

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
- Sortera kronologiskt efter datum

MÖNSTER ATT KÄNNA IGEN:
- "sk" + organisationsnummer (t.ex. "sk5566161658") = Skatteverket
- Positiv insättning från Skatteverket = skatteåterbetalning (kredit 1640)
- Negativ till Skatteverket = preliminärskatt (debet 1640)
- Bankavgifter = momsfria (konto 6570)`;

  if (financialSnapshot) {
    prompt += `\n\nANVÄNDARENS BOKFÖRINGSSTATUS:\n${financialSnapshot}`;
    prompt += `\nAnvänd kontosaldona ovan för att tolka transaktioner. T.ex. om det finns en fordran på konto 1640 och en insättning från Skatteverket, är det troligen en återbetalning mot den fordran.`;
  }

  prompt += `\n\nVIKTIGT: Svara ENBART med JSON-objektet. Ingen inledande text, ingen förklaring, bara ren JSON utan markdown-kodblock.`;

  return prompt;
}
