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

    const { templateIds, exportType = 'selected' } = await req.json();

    let query = supabaseClient
      .from('airledger_transaction_templates')
      .select('*');

    // Filter based on export type
    if (exportType === 'selected' && templateIds && templateIds.length > 0) {
      query = query.in('id', templateIds);
    } else if (exportType === 'system') {
      query = query.eq('is_system_template', true);
    } else if (exportType === 'user') {
      query = query.eq('user_id', user.id).eq('is_system_template', false);
    }

    const { data: templates, error } = await query.order('template_name');

    if (error) {
      throw error;
    }

    // Create export data
    const exportData = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      exported_user_id: user.id,
      export_type: exportType,
      template_count: templates?.length || 0,
      templates: templates?.map(template => ({
        template_name: template.template_name,
        description: template.description,
        category: template.category,
        keywords: template.keywords || [],
        template_entries: template.template_entries,
        is_system_template: template.is_system_template,
        auto_suggest: template.auto_suggest,
        user_id: template.user_id,
        metadata: {
          usage_count: template.usage_count || 0,
          last_used_at: template.last_used_at,
          created_at: template.created_at
        }
      })) || []
    };

    console.log(`[EXPORT-TEMPLATES] Exporting ${templates?.length || 0} templates for user ${user.email}`);

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="airledger-templates-${new Date().toISOString().split('T')[0]}.json"`
      },
    });

  } catch (error) {
    console.error('Error in export-templates function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});