import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    console.log('=== USE TRANSACTION TEMPLATE FUNCTION STARTED ===')
    
    const { templateName, amount, description, transactionDate, referenceNumber } = await req.json()
    console.log('Received template data:', { 
      templateName,
      amount,
      description,
      transactionDate,
      referenceNumber
    })

    if (!templateName || !amount) {
      throw new Error('Template name and amount are required')
    }

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client with service role for system templates access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Get user ID
    let userId: string
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        const token = authHeader.replace('Bearer ', '')
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.sub
        if (!userId) {
          throw new Error('Could not extract user ID from token')
        }
      } else {
        userId = user.id
      }
    } catch (jwtError) {
      throw new Error('Authentication failed')
    }

    console.log('Finding template for user:', userId)

    // Find the template
    const { data: template, error: templateError } = await supabase
      .from('airledger_transaction_templates')
      .select('*')
      .eq('template_name', templateName)
      .single()

    if (templateError) {
      console.error('Error finding template:', templateError)
      throw new Error(`Template "${templateName}" not found`)
    }

    console.log('Found template:', template.template_name)

    // Create transaction entries based on template
    const templateEntries = template.template_entries as any[]
    const entries = templateEntries.map((entry: any) => ({
      accountCode: entry.account_code,
      accountName: entry.account_name,
      debitAmount: entry.type === 'debit' ? amount : 0,
      creditAmount: entry.type === 'credit' ? amount : 0,
      description: entry.description || description || template.description
    }))

    console.log('Generated entries from template:', entries)

    // Create the transaction using save-general-transaction
    const { data: transactionData, error: transactionError } = await supabase.functions.invoke('save-general-transaction', {
      body: {
        description: description || `${template.template_name} - ${amount} kr`,
        entries: entries,
        transactionDate: transactionDate,
        referenceNumber: referenceNumber
      }
    })

    if (transactionError) {
      console.error('Error creating transaction from template:', transactionError)
      throw new Error('Failed to create transaction from template: ' + transactionError.message)
    }

    console.log('Transaction created successfully, now recording template usage...')

    // Record template usage for analytics - this will trigger the stats update
    try {
      const { error: usageError } = await supabase
        .from('airledger_template_usage')
        .insert({
          user_id: userId,
          template_id: template.id,
          transaction_id: transactionData.transaction.id,
          used_at: new Date().toISOString()
        });

      if (usageError) {
        console.error('Failed to record template usage:', usageError);
        // Don't fail the main operation if usage tracking fails
      } else {
        console.log('Template usage recorded successfully');
      }
    } catch (usageError) {
      console.error('Error recording template usage:', usageError);
      // Don't fail the main operation if usage tracking fails
    }

    console.log('=== USE TRANSACTION TEMPLATE FUNCTION COMPLETED SUCCESSFULLY ===')

    return new Response(
      JSON.stringify({
        success: true,
        transaction: transactionData.transaction,
        template_used: template.template_name,
        template_id: template.id, // Add template ID for usage tracking
        message: `Transaktion skapad från mall "${template.template_name}"`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN USE TRANSACTION TEMPLATE FUNCTION ===')
    console.error('Error details:', error)
    
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