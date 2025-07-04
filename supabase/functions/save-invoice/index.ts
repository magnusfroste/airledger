import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('Save invoice function called')
    const { customerName, amount, description, invoiceNumber, dueDate } = await req.json()

    if (!customerName || !amount || !description) {
      throw new Error('Customer name, amount and description are required')
    }

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

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

    // Get user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Authentication failed')
    }

    console.log('Saving invoice for user:', user.id)

    // Create transaction
    const transactionData = {
      user_id: user.id,
      transaction_date: new Date().toISOString().split('T')[0],
      description: `Faktura till ${customerName}: ${description}`,
      total_amount: amount,
      transaction_type: 'income',
      status: 'draft',
      reference_number: invoiceNumber || null,
      analysis_data: {
        customer_name: customerName,
        invoice_number: invoiceNumber,
        due_date: dueDate,
        type: 'outgoing_invoice'
      }
    }

    const { data: transaction, error: transError } = await supabase
      .from('airledger_transactions')
      .insert(transactionData)
      .select()
      .single()

    if (transError) {
      console.error('Error creating transaction:', transError)
      throw new Error('Failed to create transaction')
    }

    // Create accounting entries
    const entries = [
      {
        transaction_id: transaction.id,
        account_code: '1510',
        account_name: 'Kundfordringar',
        debit_amount: amount,
        credit_amount: 0,
        description: `Faktura till ${customerName}`
      },
      {
        transaction_id: transaction.id,
        account_code: '3000',
        account_name: 'Försäljning',
        debit_amount: 0,
        credit_amount: amount,
        description: description
      }
    ]

    const { data: savedEntries, error: entriesError } = await supabase
      .from('airledger_entries')
      .insert(entries)
      .select()

    if (entriesError) {
      console.error('Error creating entries:', entriesError)
      throw new Error('Failed to create accounting entries')
    }

    console.log('Invoice saved successfully')

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          ...transaction,
          entries: savedEntries
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in save-invoice function:', error)
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