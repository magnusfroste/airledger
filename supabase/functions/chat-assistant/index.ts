import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('Chat assistant function called')
    const { message, conversationHistory } = await req.json()

    if (!message) {
      throw new Error('Message is required')
    }

    console.log('Message received:', message)

    // Check if OpenAI API key is available
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not found in environment')
      throw new Error('OpenAI API key not configured')
    }

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client with auth header
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    console.log('Getting user authentication')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Authentication error:', userError)
      throw new Error(`Authentication failed: ${userError?.message || 'User not found'}`)
    }

    console.log('User authenticated:', user.id)

    // Get user's recent transactions and entries for context
    console.log('Fetching user transactions')
    const { data: transactions, error: transError } = await supabase
      .from('airledger_transactions')
      .select(`
        *,
        airledger_entries (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (transError) {
      console.error('Error fetching transactions:', transError)
    } else {
      console.log('Found transactions:', transactions?.length || 0)
    }

    // Get user profile
    console.log('Fetching user profile')
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const userName = profile?.full_name || profile?.name || 'användare'

    // Prepare context about user's bookkeeping data
    let bookkeepingContext = ''
    if (transactions && transactions.length > 0) {
      const totalTransactions = transactions.length
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0)
      const recentTransactions = transactions.slice(0, 5)
      
      bookkeepingContext = `
BOKFÖRINGSDATA FÖR ${userName.toUpperCase()}:
- Totalt antal transaktioner: ${totalTransactions}
- Total omsättning: ${totalAmount.toFixed(2)} kr

SENASTE TRANSAKTIONER:
${recentTransactions.map(t => `
- ${t.transaction_date}: ${t.description} (${t.total_amount} kr) - Status: ${t.status}
  Konton: ${t.airledger_entries?.map((e: any) => `${e.account_code} ${e.account_name}: ${e.debit_amount > 0 ? `Debet ${e.debit_amount}` : `Kredit ${e.credit_amount}`} kr`).join(', ') || 'Inga poster'}
`).join('')}
`
    } else {
      bookkeepingContext = `
BOKFÖRINGSDATA FÖR ${userName.toUpperCase()}:
- Inga transaktioner registrerade än
- Rekommenderar att börja med att ladda upp kvitton för automatisk analys
`
    }

    // Initialize OpenAI
    console.log('Initializing OpenAI client')
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    console.log('Processing chat message with OpenAI...')

    // Prepare conversation messages
    const messages = [
      {
        role: "system",
        content: `Du är en AI-assistent för bokföring som heter "Air Ledger Assistant". Du hjälper svenska småföretag med bokföring.

DINA HUVUDUPPGIFTER:
1. Konversera naturligt och ställ följdfrågor för att förstå användarens behov
2. Hjälp med bokföring baserat på användarens faktiska data
3. Ge praktiska råd om svensk bokföring och BAS-kontoplanen
4. Uppmuntra användning av kvittoanalys-funktionen
5. Var proaktiv - föreslå nästa steg och ställ relevanta frågor

BOKFÖRINGSKONTEXTEN:
${bookkeepingContext}

SVENSKA BOKFÖRINGSREGLER:
- Använd BAS 2024 kontoplan
- Bokföringsposter måste balansera (debet = kredit)
- Vanliga konton:
  * 1000-serien: Kassa/Bank
  * 2640: Leverantörsskulder  
  * 6000-serien: Rörelsekostnader
  * 3000-serien: Intäkter

KOMMUNIKATIONSSTIL:
- Var vänlig, professionell och hjälpsam
- Använd svenska
- Ställ konkreta följdfrågor
- Ge specifika råd baserat på användarens situation
- Uppmuntra att ladda upp kvitton för automatisk analys

Om användaren frågar om sina transaktioner eller bokföring, använd den data som finns i kontexten ovan.`
      }
    ]

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      console.log('Adding conversation history:', conversationHistory.length, 'messages')
      conversationHistory.forEach((msg: any) => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    })

    console.log('Calling OpenAI API')
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    })

    const aiResponse = response.choices[0].message.content

    console.log('AI response generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        context_used: bookkeepingContext.length > 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in chat-assistant function:', error)
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
