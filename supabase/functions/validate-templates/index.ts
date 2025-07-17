import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is developer
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_developer')
      .eq('id', user.id)
      .single();

    if (!profile?.is_developer) {
      return new Response(JSON.stringify({ error: 'Developer access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { templateIds } = await req.json();

    // Get templates to validate
    let query = supabaseClient
      .from('airledger_transaction_templates')
      .select('*');

    if (templateIds && templateIds.length > 0) {
      query = query.in('id', templateIds);
    }

    const { data: templates, error } = await query;
    if (error) throw error;

    // Get chart of accounts
    const { data: accounts } = await supabaseClient
      .from('airledger_chart_of_accounts')
      .select('account_code, account_name, account_type, normal_balance');

    const accountMap = new Map(accounts?.map(a => [a.account_code, a]) || []);
    const validationResults = [];

    for (const template of templates || []) {
      const issues = [];
      const warnings = [];
      const suggestions = [];

      // Check template entries
      if (template.template_entries && Array.isArray(template.template_entries)) {
        for (const entry of template.template_entries) {
          // Check if account exists
          if (!accountMap.has(entry.account_code)) {
            issues.push(`Account ${entry.account_code} not found in chart of accounts`);
          } else {
            const account = accountMap.get(entry.account_code);
            
            // Check normal balance vs entry type
            if (account.normal_balance) {
              const expectedType = account.normal_balance.toLowerCase();
              if (expectedType !== entry.type) {
                warnings.push(`Account ${entry.account_code} has normal balance '${account.normal_balance}' but entry is '${entry.type}'`);
              }
            }
          }

          // Check for missing description
          if (!entry.description || entry.description.trim() === '') {
            warnings.push(`Entry for account ${entry.account_code} lacks description`);
          }
        }

        // Check debit/credit balance
        const debits = template.template_entries.filter(e => e.type === 'debit').length;
        const credits = template.template_entries.filter(e => e.type === 'credit').length;
        
        if (debits !== credits) {
          warnings.push(`Unbalanced entries: ${debits} debits, ${credits} credits`);
        }
      } else {
        issues.push('No template entries found');
      }

      // Check keywords
      if (!template.keywords || template.keywords.length === 0) {
        suggestions.push('Consider adding keywords for better template matching');
      }

      // AI-powered analysis if OpenAI key is available
      let aiAnalysis = null;
      if (openAIApiKey && template.template_entries) {
        try {
          const prompt = `Analyze this accounting transaction template and provide suggestions:

Template: ${template.template_name}
Description: ${template.description}
Category: ${template.category}
Entries: ${JSON.stringify(template.template_entries, null, 2)}

Please provide:
1. Any potential accounting issues
2. Suggestions for better keywords
3. Description improvements
4. Category validation

Respond in Swedish and be concise.`;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Du är en expert på svensk redovisning och hjälper till att analysera transaktionsmallar.' },
                { role: 'user', content: prompt }
              ],
              max_tokens: 500,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            aiAnalysis = data.choices[0].message.content;
            suggestions.push(`AI-analys: ${aiAnalysis}`);
          }
        } catch (aiError) {
          console.error('AI analysis error:', aiError);
        }
      }

      validationResults.push({
        template_id: template.id,
        template_name: template.template_name,
        status: issues.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok',
        issues,
        warnings,
        suggestions,
        ai_analysis: aiAnalysis
      });
    }

    return new Response(JSON.stringify({
      validation_results: validationResults,
      summary: {
        total: validationResults.length,
        errors: validationResults.filter(r => r.status === 'error').length,
        warnings: validationResults.filter(r => r.status === 'warning').length,
        ok: validationResults.filter(r => r.status === 'ok').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-templates function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});