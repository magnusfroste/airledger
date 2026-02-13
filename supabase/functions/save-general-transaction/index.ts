
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
    console.log('=== SAVE GENERAL TRANSACTION FUNCTION STARTED ===')
    
    const { description, entries, transactionDate, referenceNumber } = await req.json()
    console.log('Received transaction data:', { 
      description,
      entries: entries?.length || 0,
      transactionDate,
      referenceNumber
    })

    if (!description || !entries || !Array.isArray(entries) || entries.length === 0) {
      throw new Error('Description and entries are required')
    }

    // Validate entries
    let totalDebit = 0
    let totalCredit = 0
    
    for (const entry of entries) {
      if (!entry.accountCode || !entry.accountName) {
        throw new Error('Each entry must have accountCode and accountName')
      }
      
      const debit = Number(entry.debitAmount || 0)
      const credit = Number(entry.creditAmount || 0)
      
      if (debit < 0 || credit < 0) {
        throw new Error('Debit and credit amounts cannot be negative')
      }
      
      if (debit > 0 && credit > 0) {
        throw new Error('Each entry can only have either debit OR credit amount, not both')
      }
      
      if (debit === 0 && credit === 0) {
        throw new Error('Each entry must have either a debit or credit amount')
      }
      
      totalDebit += debit
      totalCredit += credit
    }

    // Validate that debits equal credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Transaction is not balanced. Total debits: ${totalDebit}, Total credits: ${totalCredit}`)
    }

    // Validate account codes against chart of accounts
    const accountCodes = [...new Set(entries.map((e: any) => e.accountCode))]
    console.log('Validating account codes:', accountCodes)
    
    const supabaseUrlForValidation = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const validationClient = createClient(supabaseUrlForValidation, supabaseServiceKey)
    
    const { data: validAccounts, error: validationError } = await validationClient
      .from('airledger_chart_of_accounts')
      .select('account_code')
      .in('account_code', accountCodes)
      .eq('is_active', true)

    if (validationError) {
      console.error('Account validation query failed:', validationError)
      // Continue anyway - don't block transaction on validation failure
    } else {
      const validCodes = new Set(validAccounts.map((a: any) => a.account_code))
      const invalidCodes = accountCodes.filter((c: string) => !validCodes.has(c))
      
      if (invalidCodes.length > 0) {
        throw new Error(`Ogiltiga kontonummer: ${invalidCodes.join(', ')}. Kontrollera att kontona finns i BAS-kontoplanen.`)
      }
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

    const finalTransactionDate = transactionDate || new Date().toISOString().split('T')[0];

    // Check for potential duplicate transactions
    console.log('Checking for duplicate transactions...')
    const { data: existingTransactions, error: duplicateCheckError } = await supabase
      .from('airledger_transactions')
      .select('id, description, total_amount, transaction_date')
      .eq('user_id', userId)
      .eq('description', description)
      .eq('total_amount', totalDebit)
      .eq('transaction_date', finalTransactionDate)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes

    if (duplicateCheckError) {
      console.error('Error checking for duplicates:', duplicateCheckError)
      // Continue with transaction creation even if duplicate check fails
    } else if (existingTransactions && existingTransactions.length > 0) {
      console.log('Potential duplicate transaction found:', existingTransactions[0])
      
      // Return the existing transaction instead of creating a new one
      return new Response(
        JSON.stringify({
          success: true,
          transaction: existingTransactions[0],
          message: 'Transaction already exists (duplicate prevented)',
          duplicate_prevented: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create transaction
    const transactionData = {
      user_id: userId,
      transaction_date: finalTransactionDate,
      description: description,
      total_amount: totalDebit, // Use total debit as transaction amount
      transaction_type: 'expense', // Default to expense, could be made configurable
      reference_number: referenceNumber || null,
      analysis_data: {
        type: 'general_transaction',
        entries_count: entries.length,
        total_debit: totalDebit,
        total_credit: totalCredit
      }
    }

    console.log('Saving general transaction to database...')

    const { data: transaction, error: transactionError } = await supabase
      .from('airledger_transactions')
      .insert(transactionData)
      .select()
      .single()

    if (transactionError) {
      console.error('Error saving general transaction:', transactionError)
      throw new Error('Failed to save transaction: ' + transactionError.message)
    }

    console.log('General transaction saved successfully:', transaction.id)

    // Create accounting entries
    const entriesData = entries.map((entry: any) => ({
      transaction_id: transaction.id,
      account_code: entry.accountCode,
      account_name: entry.accountName,
      debit_amount: Number(entry.debitAmount || 0),
      credit_amount: Number(entry.creditAmount || 0),
      description: entry.description || description
    }))

    console.log('Saving transaction entries to database...')

    const { error: entriesError } = await supabase
      .from('airledger_entries')
      .insert(entriesData)

    if (entriesError) {
      console.error('Error saving transaction entries:', entriesError)
      throw new Error('Failed to save transaction entries: ' + entriesError.message)
    }

    console.log('=== SAVE GENERAL TRANSACTION FUNCTION COMPLETED SUCCESSFULLY ===')

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
    console.error('=== ERROR IN SAVE GENERAL TRANSACTION FUNCTION ===')
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
