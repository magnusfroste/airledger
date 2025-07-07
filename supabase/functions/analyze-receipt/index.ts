import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import OpenAI from 'https://esm.sh/openai@4.20.1'
import { checkAndUpdateQuota } from '../quota-helper/index.ts'

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
    console.log('=== ANALYZE RECEIPT FUNCTION STARTED ===')
    
    const { imageBase64 } = await req.json()
    console.log('Image data received, length:', imageBase64?.length || 0)

    if (!imageBase64) {
      throw new Error('Image data is required')
    }

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Check OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('OpenAI API key present:', !!openaiApiKey)
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    console.log('Creating Supabase client...')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Try to get user - if this fails, extract user ID from JWT
    let userId: string
    console.log('Attempting authentication...')
    
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
      throw new Error('Authentication failed')
    }

    // Check quota and increment usage - use service role for database operations
    console.log('Checking AI analysis quota for user:', userId)
    const serviceSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false }
    });
    const quotaCheck = await checkAndUpdateQuota(userId, serviceSupabase, true);
    if (!quotaCheck.allowed) {
      console.log('Quota exceeded for user:', userId, 'tier:', quotaCheck.subscription_tier);
      return new Response(
        JSON.stringify({ 
          error: 'AI-analyskvoter överskridna för denna månad',
          subscription_tier: quotaCheck.subscription_tier,
          usage: quotaCheck.usage,
          success: false
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log('Quota check passed, proceeding with analysis')

    // Initialize OpenAI
    console.log('Initializing OpenAI...')
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    console.log('Calling OpenAI Vision API...')

    // Analyze receipt with OpenAI Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a Swedish bookkeeping assistant. Analyze the receipt/invoice image and extract key information to propose bookkeeping transactions.

IMPORTANT: Try to determine if this is a RECEIPT (already paid) or INVOICE (unpaid) by looking for visual clues:
- RECEIPTS often show: "BETALT", "TACK FÖR KÖPET", transaction time, card payment confirmation
- INVOICES often show: "FÖRFALLODATUM", "ATT BETALA", "FAKTURA", bankgiro/postgiro numbers

Return a JSON object with this exact structure:
{
  "vendor": "Company name",
  "date": "YYYY-MM-DD",
  "total_amount": 123.45,
  "net_amount": 98.76,
  "vat_amount": 24.69,
  "vat_rate": 25,
  "description": "Brief description",
  "document_type": "receipt|invoice",
  "document_type_confidence": 85,
  "transaction_type": "expense",
  "suggested_payment_method": "bank|cash|expense|unpaid",
  "entries": [
    {
      "account_code": "6000",
      "account_name": "Kontorsmaterial",
      "debit_amount": 98.76,
      "credit_amount": 0,
      "description": "Kontorsmaterial från leverantör (exkl. moms)"
    },
    {
      "account_code": "2641",
      "account_name": "Ingående moms",
      "debit_amount": 24.69,
      "credit_amount": 0,
      "description": "Ingående moms 25%"
    },
    {
      "account_code": "1930",
      "account_name": "Checkkonto",
      "debit_amount": 0,
      "credit_amount": 123.45,
      "description": "Betalning via bank/kort"
    }
  ],
  "confidence": 85
}

IMPORTANT: Always extract VAT information from Swedish receipts/invoices:
- Look for "MOMS", "MVA", "VAT" on the document
- Swedish VAT rates: 25% (standard), 12% (food/transport), 6% (books/newspapers), 0% (exports)
- Calculate net_amount = total_amount / (1 + vat_rate/100)
- Calculate vat_amount = total_amount - net_amount
- Use account 2641 for "Ingående moms" (input VAT)
- If no VAT visible, assume 25% and calculate backwards from total

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

    console.log('OpenAI API call successful')
    const analysisText = response.choices[0].message.content
    console.log('Analysis result length:', analysisText?.length || 0)
    console.log('RAW OpenAI response:', analysisText)

    let analysis
    try {
      // Clean the response - sometimes OpenAI adds markdown formatting
      let cleanedText = analysisText || '{}'
      
      // Remove markdown code blocks if present
      if (cleanedText.includes('```json')) {
        cleanedText = cleanedText.replace(/```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```\s*/, '').replace(/\s*```$/, '')
      }
      
      console.log('Cleaned text for parsing:', cleanedText)
      analysis = JSON.parse(cleanedText)
      console.log('Parsed analysis:', JSON.stringify(analysis, null, 2))
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      console.error('Raw response:', analysisText)
      console.error('Cleaned response:', cleanedText)
      throw new Error('Failed to parse receipt analysis - OpenAI returned invalid JSON')
    }

    // Validate required fields
    if (!analysis.vendor || !analysis.date || !analysis.total_amount || !analysis.entries) {
      console.error('Missing required fields:', {
        vendor: !!analysis.vendor,
        date: !!analysis.date,
        total_amount: !!analysis.total_amount,
        entries: !!analysis.entries
      })
      throw new Error('Incomplete analysis data from OpenAI')
    }

    // Validate that entries balance
    const totalDebits = analysis.entries.reduce((sum: number, entry: any) => sum + (entry.debit_amount || 0), 0)
    const totalCredits = analysis.entries.reduce((sum: number, entry: any) => sum + (entry.credit_amount || 0), 0)
    
    console.log('Balance check:', { totalDebits, totalCredits })
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      console.error('Entries do not balance:', { totalDebits, totalCredits })
      throw new Error('Bookkeeping entries do not balance')
    }

    console.log('=== ANALYZE RECEIPT FUNCTION COMPLETED SUCCESSFULLY ===')

    // Return analysis for user confirmation - don't save yet
    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysis,
        user_id: userId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('=== ERROR IN ANALYZE RECEIPT FUNCTION ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
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