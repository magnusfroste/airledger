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
    console.log('=== SAVE TRANSACTION FUNCTION STARTED ===')
    
    const { analysis, entries, paymentMethod } = await req.json()
    console.log('Received data:', { 
      vendor: analysis?.vendor,
      amount: analysis?.total_amount,
      entriesCount: entries?.length,
      paymentMethod
    })

    if (!analysis || !entries) {
      throw new Error('Analysis and entries data are required')
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

    // Save transaction to database
    const transactionData = {
      user_id: userId,
      transaction_date: analysis.date,
      description: `${analysis.vendor} - ${analysis.description}`,
      total_amount: analysis.total_amount,
      transaction_type: analysis.transaction_type,
      status: 'draft',
      analysis_data: {
        ...analysis,
        confirmed_payment_method: paymentMethod
      }
    }

    console.log('Saving transaction to database...')

    const { data: transaction, error: transactionError } = await supabase
      .from('airledger_transactions')
      .insert(transactionData)
      .select()
      .single()

    if (transactionError) {
      console.error('Error saving transaction:', transactionError)
      throw new Error('Failed to save transaction: ' + transactionError.message)
    }

    console.log('Transaction saved successfully:', transaction.id)

    // Save entries
    const entriesData = entries.map((entry: any) => ({
      transaction_id: transaction.id,
      account_code: entry.account_code,
      account_name: entry.account_name,
      debit_amount: entry.debit_amount || 0,
      credit_amount: entry.credit_amount || 0,
      description: entry.description
    }))

    console.log('Saving entries to database...')

    const { error: entriesError } = await supabase
      .from('airledger_entries')
      .insert(entriesData)

    if (entriesError) {
      console.error('Error saving entries:', entriesError)
      throw new Error('Failed to save transaction entries: ' + entriesError.message)
    }

    console.log('=== SAVE TRANSACTION FUNCTION COMPLETED SUCCESSFULLY ===')

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          ...transaction,
          entries: entriesData
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN SAVE TRANSACTION FUNCTION ===')
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