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
    console.log('=== SAVE INVOICE FUNCTION STARTED ===')
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))
    
    const requestBody = await req.json()
    console.log('Request body received:', requestBody)
    
    const { customerName, amount, description, invoiceNumber, dueDate, transactionDate } = requestBody

    if (!customerName || !amount || !description) {
      console.error('Missing required fields:', { customerName: !!customerName, amount: !!amount, description: !!description })
      throw new Error('Customer name, amount and description are required')
    }

    console.log('All required fields present:', { customerName, amount, description, invoiceNumber, dueDate })

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header found')
      throw new Error('No authorization header')
    }
    
    console.log('Authorization header present:', authHeader.substring(0, 20) + '...')

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('Environment check:', { 
      supabaseUrl: !!supabaseUrl, 
      supabaseKey: !!supabaseKey 
    })
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured')
    }
    
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
        console.warn('getUser failed, extracting from JWT:', userError?.message)
        // Extract user ID from JWT token
        const token = authHeader.replace('Bearer ', '')
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.sub
        if (!userId) {
          throw new Error('Could not extract user ID from token')
        }
        console.log('Extracted user ID from JWT:', userId)
      } else {
        userId = user.id
        console.log('Got user ID from getUser:', userId)
      }
    } catch (jwtError) {
      console.error('Authentication completely failed:', jwtError)
      throw new Error('Authentication failed: ' + jwtError.message)
    }

    console.log('Saving invoice for user:', userId)

    // Calculate amounts - assume user amount is excluding VAT, add 25% VAT
    const amountExclVat = amount
    const vatAmount = Math.round(amount * 0.25 * 100) / 100 // 25% VAT, rounded to 2 decimals
    const totalAmountInclVat = amountExclVat + vatAmount

    // Create transaction
    const transactionData = {
      user_id: userId,
      transaction_date: transactionDate || new Date().toISOString().split('T')[0],
      description: `Faktura till ${customerName}: ${description}`,
      total_amount: totalAmountInclVat,
      transaction_type: 'income',
      status: 'posted',
      reference_number: invoiceNumber || null,
      analysis_data: {
        customer_name: customerName,
        invoice_number: invoiceNumber,
        due_date: dueDate,
        type: 'outgoing_invoice',
        amount_excl_vat: amountExclVat,
        vat_amount: vatAmount,
        total_amount_incl_vat: totalAmountInclVat
      }
    }

    console.log('Transaction data to save:', transactionData)

    const { data: transaction, error: transError } = await supabase
      .from('airledger_transactions')
      .insert(transactionData)
      .select()
      .single()

    if (transError) {
      console.error('Error creating transaction:', transError)
      throw new Error('Failed to create transaction')
    }

    // Create accounting entries with VAT
    const entries = [
      {
        transaction_id: transaction.id,
        account_code: '1510',
        account_name: 'Kundfordringar',
        debit_amount: totalAmountInclVat, // Total amount including VAT
        credit_amount: 0,
        description: `Faktura till ${customerName}`
      },
      {
        transaction_id: transaction.id,
        account_code: '3000',
        account_name: 'Försäljning',
        debit_amount: 0,
        credit_amount: amountExclVat, // Sales amount excluding VAT
        description: description
      },
      {
        transaction_id: transaction.id,
        account_code: '2640',
        account_name: 'Utgående moms',
        debit_amount: 0,
        credit_amount: vatAmount, // VAT amount
        description: `Moms 25% på ${description}`
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

    console.log('=== SAVE INVOICE FUNCTION COMPLETED SUCCESSFULLY ===')

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
    console.error('=== ERROR IN SAVE INVOICE FUNCTION ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
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