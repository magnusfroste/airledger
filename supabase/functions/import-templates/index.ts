import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { importData, conflictAction = 'skip' } = await req.json();

    if (!importData || !importData.templates) {
      return new Response(JSON.stringify({ error: 'Invalid import data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate import data structure
    if (!importData.version || !Array.isArray(importData.templates)) {
      return new Response(JSON.stringify({ error: 'Invalid import data format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get chart of accounts for validation
    const { data: accounts } = await supabaseClient
      .from('airledger_chart_of_accounts')
      .select('account_code, account_name');

    const validAccountCodes = new Set(accounts?.map(a => a.account_code) || []);

    const validationErrors: string[] = [];
    const warnings: string[] = [];
    const validTemplates = [];

    // Validate each template
    for (const template of importData.templates) {
      const templateErrors: string[] = [];

      // Required fields
      if (!template.template_name) templateErrors.push('Missing template_name');
      if (!template.description) templateErrors.push('Missing description');
      if (!template.category) templateErrors.push('Missing category');
      if (!template.template_entries || !Array.isArray(template.template_entries)) {
        templateErrors.push('Missing or invalid template_entries');
      }

      // Validate template entries
      if (template.template_entries) {
        let totalDebit = 0;
        let totalCredit = 0;
        
        for (const entry of template.template_entries) {
          if (!entry.account_code) templateErrors.push('Entry missing account_code');
          if (!entry.account_name) templateErrors.push('Entry missing account_name');
          if (!entry.type || !['debit', 'credit'].includes(entry.type)) {
            templateErrors.push('Entry missing or invalid type (must be debit or credit)');
          }

          // Check if account exists in chart of accounts
          if (entry.account_code && !validAccountCodes.has(entry.account_code)) {
            warnings.push(`Account ${entry.account_code} (${entry.account_name}) not found in chart of accounts for template "${template.template_name}"`);
          }

          // Count entries for balance check (assuming equal amounts)
          if (entry.type === 'debit') totalDebit++;
          if (entry.type === 'credit') totalCredit++;
        }

        // Warning if entries seem unbalanced
        if (totalDebit !== totalCredit) {
          warnings.push(`Template "${template.template_name}" has unequal debit/credit entries (${totalDebit} debit, ${totalCredit} credit)`);
        }
      }

      if (templateErrors.length > 0) {
        validationErrors.push(`Template "${template.template_name || 'Unknown'}": ${templateErrors.join(', ')}`);
      } else {
        validTemplates.push(template);
      }
    }

    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        validationErrors,
        warnings 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing templates
    const templateNames = validTemplates.map(t => t.template_name);
    const { data: existingTemplates } = await supabaseClient
      .from('airledger_transaction_templates')
      .select('template_name')
      .in('template_name', templateNames);

    const existingNames = new Set(existingTemplates?.map(t => t.template_name) || []);
    const conflicts = validTemplates.filter(t => existingNames.has(t.template_name));
    
    let templatesToImport = validTemplates;

    // Handle conflicts
    if (conflicts.length > 0) {
      if (conflictAction === 'skip') {
        templatesToImport = validTemplates.filter(t => !existingNames.has(t.template_name));
        warnings.push(`Skipped ${conflicts.length} templates due to name conflicts`);
      } else if (conflictAction === 'overwrite') {
        // Delete existing templates first
        await supabaseClient
          .from('airledger_transaction_templates')
          .delete()
          .in('template_name', conflicts.map(t => t.template_name));
      }
    }

    // Import templates
    const importResults = [];
    for (const template of templatesToImport) {
      const { data, error } = await supabaseClient
        .from('airledger_transaction_templates')
        .insert({
          user_id: user.id,
          template_name: template.template_name,
          description: template.description,
          category: template.category,
          keywords: template.keywords || [],
          template_entries: template.template_entries,
          is_system_template: template.is_system_template || false,
          auto_suggest: template.auto_suggest !== false,
          is_recurring: false,
          usage_count: 0
        })
        .select()
        .single();

      if (error) {
        warnings.push(`Failed to import template "${template.template_name}": ${error.message}`);
      } else {
        importResults.push(data);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported: importResults.length,
      skipped: validTemplates.length - importResults.length,
      total_validated: validTemplates.length,
      warnings,
      conflicts: conflicts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in import-templates function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});