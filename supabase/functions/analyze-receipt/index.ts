import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import OpenAI from 'https://esm.sh/openai@4.20.1'

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
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      throw new Error('Image data is required')
    }

    // Get authenticated user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: req.headers.get('Authorization')! } 
        } 
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Authentication required')
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })

    console.log('Analyzing receipt with OpenAI Vision...')

    // Analyze receipt with OpenAI Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a Swedish bookkeeping assistant. Analyze the receipt image and extract key information to propose bookkeeping transactions.

Return a JSON object with this exact structure:
{
  "vendor": "Company name",
  "date": "YYYY-MM-DD",
  "total_amount": 123.45,
  "description": "Brief description",
  "transaction_type": "expense",
  "entries": [
    {
      "account_code": "6000",
      "account_name": "Kontorsmaterial",
      "debit_amount": 123.45,
      "credit_amount": 0,
      "description": "Kontorsmaterial från leverantör"
    },
    {
      "account_code": "2640",
      "account_name": "Leverantörsskulder",
      "debit_amount": 0,
      "credit_amount": 123.45,
      "description": "Skuld till leverantör"
    }
  ],
  "confidence": 85
}

Use Swedish accounting plan (BAS 2024) account codes:
- 1000-1999: Tillgångar (Assets)
- 2000-2999: Skulder och eget kapital (Liabilities & Equity)
- 3000-3999: Intäkter (Revenue)
- 4000-4999: Kostnader (Expenses)
- 6000-6999: Rörelsekostnader (Operating expenses)
- 7000-7999: Finansiella poster (Financial items)

Common expense accounts:
- 6000: Kontorsmaterial
- 6110: Kontorsteknik
- 6212: Telefon
- 6310: Representation
- 6420: Hyra
- 6540: IT-tjänster
- 6570: Övriga tjänster

For expenses, typically:
- Debit: Expense account (6xxx)
- Credit: Cash/Bank account (1xxx) or Accounts Payable (2640)

Ensure entries balance (total debits = total credits)!`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this Swedish receipt and propose bookkeeping entries:"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    })

    const analysisText = response.choices[0].message.content
    console.log('OpenAI analysis result:', analysisText)

    let analysis
    try {
      analysis = JSON.parse(analysisText || '{}')
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      throw new Error('Failed to parse receipt analysis')
    }

    // Validate required fields
    if (!analysis.vendor || !analysis.date || !analysis.total_amount || !analysis.entries) {
      throw new Error('Incomplete analysis data from OpenAI')
    }

    // Validate that entries balance
    const totalDebits = analysis.entries.reduce((sum: number, entry: any) => sum + (entry.debit_amount || 0), 0)
    const totalCredits = analysis.entries.reduce((sum: number, entry: any) => sum + (entry.credit_amount || 0), 0)
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      console.error('Entries do not balance:', { totalDebits, totalCredits })
      throw new Error('Bookkeeping entries do not balance')
    }

    // Save transaction to database
    const transactionData = {
      user_id: user.id,
      transaction_date: analysis.date,
      description: `${analysis.vendor} - ${analysis.description}`,
      total_amount: analysis.total_amount,
      transaction_type: analysis.transaction_type,
      status: 'draft',
      analysis_data: analysis
    }

    console.log('Saving transaction:', transactionData)

    const { data: transaction, error: transactionError } = await supabase
      .from('airledger_transactions')
      .insert(transactionData)
      .select()
      .single()

    if (transactionError) {
      console.error('Error saving transaction:', transactionError)
      throw new Error('Failed to save transaction')
    }

    // Save entries
    const entriesData = analysis.entries.map((entry: any) => ({
      transaction_id: transaction.id,
      account_code: entry.account_code,
      account_name: entry.account_name,
      debit_amount: entry.debit_amount || 0,
      credit_amount: entry.credit_amount || 0,
      description: entry.description
    }))

    console.log('Saving entries:', entriesData)

    const { error: entriesError } = await supabase
      .from('airledger_entries')
      .insert(entriesData)

    if (entriesError) {
      console.error('Error saving entries:', entriesError)
      throw new Error('Failed to save transaction entries')
    }

    console.log('Successfully analyzed receipt and saved transaction')

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          ...transaction,
          entries: entriesData
        },
        analysis: analysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in analyze-receipt function:', error)
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