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
    console.log('=== SAVE PAYMENT FUNCTION STARTED ===')
    
    const { customerName, amount, description, transactionDate } = await req.json()
    console.log('Received payment data:', { 
      customerName,
      amount,
      description
    })

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

    // Create payment transaction
    const transactionData = {
      user_id: userId,
      transaction_date: transactionDate || new Date().toISOString().split('T')[0],
      description: `Betalning från ${customerName}`,
      total_amount: amount,
      transaction_type: 'income',
      status: 'posted',
      analysis_data: {
        type: 'customer_payment',
        customer_name: customerName,
        payment_description: description
      }
    }

    console.log('Saving payment transaction to database...')

    const { data: transaction, error: transactionError } = await supabase
      .from('airledger_transactions')
      .insert(transactionData)
      .select()
      .single()

    if (transactionError) {
      console.error('Error saving payment transaction:', transactionError)
      throw new Error('Failed to save payment transaction: ' + transactionError.message)
    }

    console.log('Payment transaction saved successfully:', transaction.id)

    // Create accounting entries for the payment
    const entriesData = [
      {
        transaction_id: transaction.id,
        account_code: '1930',
        account_name: 'Checkkonto',
        debit_amount: amount,
        credit_amount: 0,
        description: `Betalning från ${customerName}`
      },
      {
        transaction_id: transaction.id,
        account_code: '1510',
        account_name: 'Kundfordringar',
        debit_amount: 0,
        credit_amount: amount,
        description: `Betalning från ${customerName}`
      }
    ]

    console.log('Saving payment entries to database...')

    const { error: entriesError } = await supabase
      .from('airledger_entries')
      .insert(entriesData)

    if (entriesError) {
      console.error('Error saving payment entries:', entriesError)
      throw new Error('Failed to save payment entries: ' + entriesError.message)
    }

    console.log('=== SAVE PAYMENT FUNCTION COMPLETED SUCCESSFULLY ===')

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
    console.error('=== ERROR IN SAVE PAYMENT FUNCTION ===')
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