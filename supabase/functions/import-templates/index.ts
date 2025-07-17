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

    console.log(`[IMPORT-TEMPLATES] Starting import for user ${user.email}, conflict action: ${conflictAction}`);

    if (!importData || !importData.templates) {
      console.error('[IMPORT-TEMPLATES] Invalid import data - missing templates');
      return new Response(JSON.stringify({ error: 'Invalid import data - missing templates' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate import data structure
    if (!importData.version || !Array.isArray(importData.templates)) {
      console.error('[IMPORT-TEMPLATES] Invalid import data format:', { hasVersion: !!importData.version, templatesIsArray: Array.isArray(importData.templates) });
      return new Response(JSON.stringify({ error: 'Invalid import data format - missing version or templates not array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[IMPORT-TEMPLATES] Validating ${importData.templates.length} templates`);

    // Get chart of accounts for validation
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('airledger_chart_of_accounts')
      .select('account_code, account_name');

    if (accountsError) {
      console.error('[IMPORT-TEMPLATES] Error fetching chart of accounts:', accountsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch chart of accounts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validAccountCodes = new Set(accounts?.map(a => a.account_code) || []);
    console.log(`[IMPORT-TEMPLATES] Loaded ${validAccountCodes.size} valid account codes`);

    const validationErrors: string[] = [];
    const warnings: string[] = [];
    const validTemplates = [];

    // Validate each template
    for (let i = 0; i < importData.templates.length; i++) {
      const template = importData.templates[i];
      const templateErrors: string[] = [];

      console.log(`[IMPORT-TEMPLATES] Validating template ${i + 1}: ${template.template_name || 'unnamed'}`);

      // Required fields
      if (!template.template_name || typeof template.template_name !== 'string') {
        templateErrors.push('Missing or invalid template_name');
      }
      if (!template.description || typeof template.description !== 'string') {
        templateErrors.push('Missing or invalid description');
      }
      if (!template.category || typeof template.category !== 'string') {
        templateErrors.push('Missing or invalid category');
      }
      if (!template.template_entries || !Array.isArray(template.template_entries)) {
        templateErrors.push('Missing or invalid template_entries (must be array)');
      }
      if (template.template_entries && template.template_entries.length === 0) {
        templateErrors.push('template_entries cannot be empty');
      }

      // Validate template entries
      if (template.template_entries && Array.isArray(template.template_entries)) {
        let totalDebit = 0;
        let totalCredit = 0;
        
        for (let j = 0; j < template.template_entries.length; j++) {
          const entry = template.template_entries[j];
          
          if (!entry.account_code || typeof entry.account_code !== 'string') {
            templateErrors.push(`Entry ${j + 1} missing or invalid account_code`);
          }
          if (!entry.account_name || typeof entry.account_name !== 'string') {
            templateErrors.push(`Entry ${j + 1} missing or invalid account_name`);
          }
          // Type field is optional - only validate if present
          if (entry.type && !['debit', 'credit'].includes(entry.type)) {
            templateErrors.push(`Entry ${j + 1} invalid type (must be debit or credit)`);
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
      console.error('[IMPORT-TEMPLATES] Validation failed:', validationErrors);
      return new Response(JSON.stringify({ 
        error: 'Template validation failed', 
        validationErrors,
        warnings,
        validTemplates: validTemplates.length,
        totalTemplates: importData.templates.length
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[IMPORT-TEMPLATES] Validation passed for ${validTemplates.length} templates`);

    // Check for existing templates
    const templateNames = validTemplates.map(t => t.template_name);
    const { data: existingTemplates, error: existingError } = await supabaseClient
      .from('airledger_transaction_templates')
      .select('template_name')
      .eq('user_id', user.id)
      .in('template_name', templateNames);

    if (existingError) {
      console.error('[IMPORT-TEMPLATES] Error checking existing templates:', existingError);
      return new Response(JSON.stringify({ error: 'Failed to check existing templates' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const existingNames = new Set(existingTemplates?.map(t => t.template_name) || []);
    const conflicts = validTemplates.filter(t => existingNames.has(t.template_name));
    
    console.log(`[IMPORT-TEMPLATES] Found ${conflicts.length} conflicting templates`);
    
    let templatesToImport = validTemplates;

    // Handle conflicts
    if (conflicts.length > 0) {
      if (conflictAction === 'skip') {
        templatesToImport = validTemplates.filter(t => !existingNames.has(t.template_name));
        warnings.push(`Skipped ${conflicts.length} templates due to name conflicts`);
        console.log(`[IMPORT-TEMPLATES] Skipping ${conflicts.length} templates, importing ${templatesToImport.length}`);
      } else if (conflictAction === 'overwrite') {
        // Delete existing templates first
        console.log(`[IMPORT-TEMPLATES] Deleting ${conflicts.length} existing templates for overwrite`);
        const { error: deleteError } = await supabaseClient
          .from('airledger_transaction_templates')
          .delete()
          .eq('user_id', user.id)
          .in('template_name', conflicts.map(t => t.template_name));

        if (deleteError) {
          console.error('[IMPORT-TEMPLATES] Error deleting existing templates:', deleteError);
          return new Response(JSON.stringify({ error: 'Failed to delete existing templates' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Import templates
    console.log(`[IMPORT-TEMPLATES] Importing ${templatesToImport.length} templates`);
    const importResults = [];
    
    for (const template of templatesToImport) {
      try {
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
          console.error(`[IMPORT-TEMPLATES] Error importing template "${template.template_name}":`, error);
          warnings.push(`Failed to import template "${template.template_name}": ${error.message}`);
        } else {
          importResults.push(data);
        }
      } catch (err) {
        console.error(`[IMPORT-TEMPLATES] Exception importing template "${template.template_name}":`, err);
        warnings.push(`Failed to import template "${template.template_name}": ${err.message}`);
      }
    }

    console.log(`[IMPORT-TEMPLATES] Import completed: ${importResults.length} imported, ${conflicts.length} conflicts, ${warnings.length} warnings`);

    return new Response(JSON.stringify({
      success: true,
      imported: importResults.length,
      skipped: validTemplates.length - importResults.length,
      total_validated: validTemplates.length,
      warnings,
      conflicts: conflicts.length,
      conflictNames: conflicts.map(t => t.template_name)
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