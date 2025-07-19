
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

    // Create transaction entries based on template with placeholder replacement
    const templateEntries = template.template_entries as any[]
    
    console.log('Template entries before processing:', templateEntries)
    
    // Analyze template to determine if it uses VAT placeholders
    const hasVatPlaceholders = templateEntries.some(entry => {
      const debitAmount = entry.debit_amount?.toString() || ''
      const creditAmount = entry.credit_amount?.toString() || ''
      
      return debitAmount.includes('{vat_amount}') || 
             debitAmount.includes('{amount_excluding_vat}') || 
             debitAmount.includes('{total_amount}') ||
             creditAmount.includes('{vat_amount}') || 
             creditAmount.includes('{amount_excluding_vat}') || 
             creditAmount.includes('{total_amount}')
    })

    console.log('Template uses VAT placeholders:', hasVatPlaceholders)

    // Calculate amounts based on whether template uses VAT
    const inputAmount = parseFloat(amount.toString())
    let amountExcludingVat: number
    let vatAmount: number
    let totalAmount: number

    if (hasVatPlaceholders) {
      // Template uses VAT placeholders - calculate VAT
      const vatRate = template.vat_rate || 0.25 // Default to 25% Swedish VAT
      
      // For sales templates, input is typically excluding VAT
      amountExcludingVat = inputAmount
      vatAmount = amountExcludingVat * vatRate
      totalAmount = amountExcludingVat + vatAmount
      
      console.log('VAT calculations applied:', {
        inputAmount,
        amountExcludingVat,
        vatAmount,
        totalAmount,
        vatRate
      })
    } else {
      // Template doesn't use VAT placeholders - use exact amount
      amountExcludingVat = inputAmount
      vatAmount = 0
      totalAmount = inputAmount
      
      console.log('No VAT calculations - using exact amount:', {
        inputAmount,
        exactAmount: totalAmount
      })
    }

    // Replace placeholders in template entries
    const entries = templateEntries.map((entry: any) => {
      let debitAmount = 0
      let creditAmount = 0
      
      // Handle debit amounts
      if (entry.debit_amount !== null && entry.debit_amount !== undefined) {
        if (typeof entry.debit_amount === 'string') {
          if (entry.debit_amount === '{amount_excluding_vat}') {
            debitAmount = amountExcludingVat
          } else if (entry.debit_amount === '{vat_amount}') {
            debitAmount = vatAmount
          } else if (entry.debit_amount === '{total_amount}') {
            debitAmount = totalAmount
          } else if (entry.debit_amount === '{amount}') {
            // Generic placeholder - use input amount
            debitAmount = inputAmount
          } else {
            debitAmount = parseFloat(entry.debit_amount) || 0
          }
        } else {
          debitAmount = parseFloat(entry.debit_amount) || 0
        }
      }
      
      // Handle credit amounts
      if (entry.credit_amount !== null && entry.credit_amount !== undefined) {
        if (typeof entry.credit_amount === 'string') {
          if (entry.credit_amount === '{amount_excluding_vat}') {
            creditAmount = amountExcludingVat
          } else if (entry.credit_amount === '{vat_amount}') {
            creditAmount = vatAmount
          } else if (entry.credit_amount === '{total_amount}') {
            creditAmount = totalAmount
          } else if (entry.credit_amount === '{amount}') {
            // Generic placeholder - use input amount
            creditAmount = inputAmount
          } else {
            creditAmount = parseFloat(entry.credit_amount) || 0
          }
        } else {
          creditAmount = parseFloat(entry.credit_amount) || 0
        }
      }
      
      // Fallback for older templates that use 'type' field
      if (debitAmount === 0 && creditAmount === 0) {
        if (entry.type === 'debit') {
          debitAmount = inputAmount
        } else if (entry.type === 'credit') {
          creditAmount = inputAmount
        }
      }
      
      return {
        accountCode: entry.account_code,
        accountName: entry.account_name,
        debitAmount,
        creditAmount,
        description: entry.description || description || template.description
      }
    })

    console.log('Generated entries from template:', entries)

    // Validate that entries balance
    const totalDebit = entries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0)
    const totalCredit = entries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0)
    
    console.log('Balance check:', { totalDebit, totalCredit })
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Unbalanced transaction detected')
      console.error('Template entries:', templateEntries)
      console.error('Generated entries:', entries)
      throw new Error(`Transaction entries are not balanced. Total debits: ${totalDebit.toFixed(2)}, Total credits: ${totalCredit.toFixed(2)}. This indicates an issue with the template "${templateName}".`)
    }

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
        template_id: template.id,
        message: `Transaktion skapad från mall "${template.template_name}"`,
        vat_applied: hasVatPlaceholders,
        amounts: hasVatPlaceholders ? {
          excluding_vat: amountExcludingVat,
          vat_amount: vatAmount,
          total_amount: totalAmount
        } : {
          exact_amount: inputAmount
        }
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
