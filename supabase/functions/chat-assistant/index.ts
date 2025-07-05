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

    console.log('Auth header received')

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

    // Try to get user - if this fails, extract user ID from JWT
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
      throw new Error('Authentication failed')
    }

    // Get user's recent transactions and entries for context
    console.log('Fetching user transactions for user:', userId)
    const { data: transactions, error: transError } = await supabase
      .from('airledger_transactions')
      .select(`
        *,
        airledger_entries (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get user's opening balances
    console.log('Fetching opening balances for user:', userId)
    const { data: openingBalances, error: openingError } = await supabase
      .from('airledger_opening')
      .select('*')
      .eq('user_id', userId)
      .order('account_code', { ascending: true })

    // Get chart of accounts for AI context
    console.log('Fetching chart of accounts')
    const { data: chartOfAccounts, error: chartError } = await supabase
      .from('airledger_chart_of_accounts')
      .select('account_code, account_name, account_type, normal_balance')
      .eq('is_active', true)
      .order('account_code', { ascending: true })

    if (chartError) {
      console.error('Error fetching chart of accounts:', chartError)
    }

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
      .eq('id', userId)
      .single()

    const userName = profile?.full_name || profile?.name || 'användare'

    // Prepare context about user's bookkeeping data
    let bookkeepingContext = ''
    
    // Add chart of accounts context
    let chartContext = ''
    if (chartOfAccounts && chartOfAccounts.length > 0) {
      // Group accounts by type for better organization
      const accountsByType = chartOfAccounts.reduce((acc: any, account) => {
        if (!acc[account.account_type]) acc[account.account_type] = []
        acc[account.account_type].push(account)
        return acc
      }, {})

      chartContext = `
BAS 2024 KONTOPLAN (urval av vanligaste kontona):

TILLGÅNGAR (Assets - Normal balans: Debet):
${accountsByType.asset?.slice(0, 20).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

SKULDER (Liabilities - Normal balans: Kredit):
${accountsByType.liability?.slice(0, 15).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

EGET KAPITAL (Equity - Normal balans: Kredit):
${accountsByType.equity?.slice(0, 10).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

INTÄKTER (Income - Normal balans: Kredit):
${accountsByType.income?.slice(0, 15).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

KOSTNADER (Expenses - Normal balans: Debet):
${accountsByType.expense?.slice(0, 30).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

VIKTIGA KONTON ATT KOMMA IHÅG:
- 1930 Checkkonto (bankkonto)
- 1510 Kundfordringar (när du fakturerat men inte fått betalt)
- 2640 Leverantörsskulder (när du fått faktura men inte betalat)
- 3000 Försäljning (intäkter från försäljning)
- 4000 Inköp av varor (kostnader för varor du säljer)
- 6000 Lokalhyra, 6830 Bankavgifter, 6850 Försäkringar

När användaren nämner kontonummer, använd denna lista för att ge korrekt kontonamn.
`
    } else {
      chartContext = `
BAS 2024 KONTOPLAN:
- Kontoplanen är inte tillgänglig för tillfället
- Uppmuntra användaren att använda standardkonton som 1930 (Checkkonto)
`
    }
    
    // Add opening balances context
    let openingBalancesContext = ''
    if (openingBalances && openingBalances.length > 0) {
      openingBalancesContext = `
INGÅENDE BALANSER:
${openingBalances.map(ob => `
- ${ob.account_code} ${ob.account_name}: ${ob.opening_balance} kr (${ob.balance_type === 'debit' ? 'Debet' : 'Kredit'})
`).join('')}
`
    } else {
      openingBalancesContext = `
INGÅENDE BALANSER:
- Inga ingående balanser registrerade än
- Hjälp användaren att registrera ingående balanser genom att tala in dem
`
    }
    
    if (transactions && transactions.length > 0) {
      const totalTransactions = transactions.length
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0)
      const recentTransactions = transactions.slice(0, 5)
      
      bookkeepingContext = `
BOKFÖRINGSDATA FÖR ${userName.toUpperCase()}:

${chartContext}

${openingBalancesContext}

TRANSAKTIONER:
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

${chartContext}

${openingBalancesContext}

TRANSAKTIONER:
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
3. Ge praktiska råd om svensk bokföring och BAS-kontoplanen 2024
4. Hjälp användaren registrera ingående balanser genom att tala in dem
5. Uppmuntra användning av kvittoanalys-funktionen
6. Var proaktiv - föreslå nästa steg och ställ relevanta frågor

BOKFÖRINGSKONTEXTEN:
${bookkeepingContext}

BAS KONTOPLAN 2024 - DEBET/KREDIT REGLER:
- 1000-1999: TILLGÅNGAR (Assets)
  * Normal balans: DEBET-sidan
  * Ökning: Debet, Minskning: Kredit
  * Ex: 1930 Checkkonto, 1510 Kundfordringar, 1200 Inventarier

- 2000-2999: SKULDER (Liabilities) 
  * Normal balans: KREDIT-sidan
  * Ökning: Kredit, Minskning: Debet
  * Ex: 2640 Leverantörsskulder, 2440 Skatteskulder, 2018 Banklån

- 3000-3999: INTÄKTER (Revenue)
  * Normal balans: KREDIT-sidan
  * Ökning: Kredit, Minskning: Debet
  * Ex: 3000 Försäljning, 3740 Öres- och kronutjämning

- 4000-4999 & 6000-6999: KOSTNADER (Expenses)
  * Normal balans: DEBET-sidan
  * Ökning: Debet, Minskning: Kredit
  * Ex: 6000 Lokalhyra, 4000 Inköp av varor, 6570 Kontorsmaterial

INGÅENDE BALANSER:
När användaren nämner ingående balanser eller saldo på konton:
1. Fråga vilket konto (kontonummer och namn)
2. Fråga beloppet
3. Förklara att systemet automatiskt bestämmer om det är debet eller kredit baserat på kontotyp
4. Använd funktionen save-opening-balance för att spara

UTGÅENDE FAKTUROR:
När användaren nämner att de har fakturerat en kund:
1. Identifiera kundnamn, belopp och beskrivning av tjänst/vara
2. Belopp som användaren anger behandlas som EXKLUSIVE moms - 25% moms läggs automatiskt på
3. Fråga efter fakturanummer och förfallodatum (valfritt)
4. Använd funktionen save-invoice för att spara
5. Bokföring sker automatiskt med tre poster: Debet 1510 Kundfordringar (inkl moms), Kredit 3000 Försäljning (exkl moms), Kredit 2640 Utgående moms

KOMMUNIKATIONSSTIL:
- Var vänlig, professionell och hjälpsam
- Använd svenska
- **ANVÄND ALLTID KORREKT KONTONAMN** när du nämner kontonummer (t.ex. "1930 Checkkonto", inte bara "1930")
- Hämta kontonamn från kontoplanen som finns i bokföringskontexten ovan
- Ställ konkreta följdfrågor
- Ge specifika råd baserat på användarens situation
- Uppmuntra att ladda upp kvitton för automatisk analys
- Hjälp användaren förstå skillnaden mellan debet och kredit

VIKTIGT: När du nämner kontonummer, ALLTID inkludera kontonamnet från kontoplanen!

Om användaren frågar om sina transaktioner, ingående balanser eller bokföring, använd den data som finns i kontexten ovan.`
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
      max_tokens: 800,
      temperature: 0.3,
      tools: [
        {
          type: "function",
          function: {
            name: "save_opening_balance",
            description: "Spara en ingående balans för ett konto",
            parameters: {
              type: "object",
              properties: {
                accountCode: {
                  type: "string",
                  description: "Kontonummer enligt BAS 2024 (ex: 1930, 2640)"
                },
                accountName: {
                  type: "string", 
                  description: "Kontonamn (ex: Checkkonto, Leverantörsskulder)"
                },
                amount: {
                  type: "number",
                  description: "Belopp för ingående balans"
                }
              },
              required: ["accountCode", "accountName", "amount"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "save_invoice",
            description: "Spara en utgående faktura när användaren nämner att de har fakturerat någon. ANVÄND DENNA FUNKTION när användaren säger att de har fakturerat en kund.",
            parameters: {
              type: "object",
              properties: {
                customerName: {
                  type: "string",
                  description: "Kundens namn eller företag"
                },
                amount: {
                  type: "number",
                  description: "Fakturabelopp i kronor"
                },
                description: {
                  type: "string",
                  description: "Beskrivning av vara/tjänst som fakturerats"
                },
                invoiceNumber: {
                  type: "string",
                  description: "Fakturanummer (valfritt)"
                },
                dueDate: {
                  type: "string",
                  description: "Förfallodatum i format YYYY-MM-DD (valfritt)"
                }
              },
              required: ["customerName", "amount", "description"]
            }
          }
        }
      ],
      tool_choice: "auto"
    })

    console.log('OpenAI response received')
    console.log('Tool calls:', response.choices[0].message.tool_calls?.length || 0)

    let aiResponse = response.choices[0].message.content
    const toolCalls = response.choices[0].message.tool_calls

    // Handle function calls
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'save_opening_balance') {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            console.log('Saving opening balance:', args)
            
            // Call the save-opening-balance function
            const { data: saveData, error: saveError } = await supabase.functions.invoke('save-opening-balance', {
              body: {
                accountCode: args.accountCode,
                accountName: args.accountName,
                amount: args.amount
              }
            })

            if (saveError) {
              console.error('Error saving opening balance:', saveError)
              aiResponse += `\n\n❌ Ett fel uppstod när jag försökte spara den ingående balansen: ${saveError.message}`
            } else if (saveData?.success) {
              console.log('Opening balance saved successfully')
              aiResponse += `\n\n✅ Perfekt! Jag har sparat den ingående balansen för ${args.accountCode} ${args.accountName} med ${args.amount} kr.`
            } else {
              aiResponse += `\n\n❌ Ett okänt fel uppstod när jag försökte spara den ingående balansen.`
            }
          } catch (parseError) {
            console.error('Error parsing function arguments:', parseError)
            aiResponse += `\n\n❌ Ett fel uppstod när jag försökte tolka kontoinformationen.`
          }
        } else if (toolCall.function.name === 'save_invoice') {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            console.log('Saving invoice:', args)
            
            // Call the save-invoice function
            const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('save-invoice', {
              body: {
                customerName: args.customerName,
                amount: args.amount,
                description: args.description,
                invoiceNumber: args.invoiceNumber,
                dueDate: args.dueDate
              }
            })

            if (invoiceError) {
              console.error('Error saving invoice:', invoiceError)
              aiResponse += `\n\n❌ Ett fel uppstod när jag försökte spara fakturan: ${invoiceError.message}`
            } else if (invoiceData?.success) {
              console.log('Invoice saved successfully')
              const transaction = invoiceData.transaction
              const analysisData = transaction.analysis_data
              
              aiResponse += `\n\n✅ Perfekt! Jag har bokfört fakturan till ${args.customerName}.\n\n` +
                `**Belopp exkl. moms:** ${analysisData.amount_excl_vat} kr\n` +
                `**Moms (25%):** ${analysisData.vat_amount} kr\n` +
                `**Totalt inkl. moms:** ${analysisData.total_amount_incl_vat} kr\n\n` +
                `**Bokföringsposter:**\n` +
                `• Debet: 1510 Kundfordringar ${analysisData.total_amount_incl_vat} kr\n` +
                `• Kredit: 3000 Försäljning ${analysisData.amount_excl_vat} kr\n` +
                `• Kredit: 2640 Utgående moms ${analysisData.vat_amount} kr`
            } else {
              aiResponse += `\n\n❌ Ett okänt fel uppstod när jag försökte spara fakturan.`
            }
          } catch (parseError) {
            console.error('Error parsing invoice arguments:', parseError)
            aiResponse += `\n\n❌ Ett fel uppstod när jag försökte tolka fakturinformationen.`
          }
        }
      }
    }

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
