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
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const demoEmail = 'demo@airledger.se'
    const demoPassword = '123456'

    console.log('Creating demo user:', demoEmail)

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(demoEmail)
    
    if (existingUser.user) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demo user already exists',
          email: demoEmail 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create the demo user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: 'Demo Användare',
        name: 'Demo Användare'
      }
    })

    if (error) {
      console.error('Error creating demo user:', error)
      throw error
    }

    console.log('Demo user created successfully:', data.user?.id)

    // Create some sample transactions for the demo user
    if (data.user) {
      const sampleTransactions = [
        {
          user_id: data.user.id,
          transaction_date: '2024-01-15',
          description: 'ICA Maxi Stockholm - Kontorsmaterial',
          total_amount: 487.50,
          transaction_type: 'expense',
          status: 'posted',
          analysis_data: {
            vendor: 'ICA Maxi Stockholm',
            confidence: 95
          }
        },
        {
          user_id: data.user.id,
          transaction_date: '2024-01-10',
          description: 'Kund ABC AB - Konsultuppdrag',
          total_amount: 15000.00,
          transaction_type: 'income',
          status: 'posted',
          analysis_data: {
            vendor: 'ABC AB',
            confidence: 98
          }
        },
        {
          user_id: data.user.id,
          transaction_date: '2024-01-08',
          description: 'Telia AB - Telefonräkning',
          total_amount: 299.00,
          transaction_type: 'expense',
          status: 'posted',
          analysis_data: {
            vendor: 'Telia AB',
            confidence: 92
          }
        }
      ]

      // Insert sample transactions
      const { data: transactions, error: transError } = await supabaseAdmin
        .from('airledger_transactions')
        .insert(sampleTransactions)
        .select()

      if (transError) {
        console.error('Error creating sample transactions:', transError)
      } else {
        console.log('Sample transactions created:', transactions?.length)

        // Create sample entries for each transaction
        const sampleEntries = []
        
        // Entries for first transaction (expense)
        if (transactions && transactions[0]) {
          sampleEntries.push(
            {
              transaction_id: transactions[0].id,
              account_code: '6000',
              account_name: 'Kontorsmaterial',
              debit_amount: 487.50,
              credit_amount: 0,
              description: 'Kontorsmaterial från ICA'
            },
            {
              transaction_id: transactions[0].id,
              account_code: '1930',
              account_name: 'Bankkonto',
              debit_amount: 0,
              credit_amount: 487.50,
              description: 'Betalning via bank'
            }
          )
        }

        // Entries for second transaction (income)
        if (transactions && transactions[1]) {
          sampleEntries.push(
            {
              transaction_id: transactions[1].id,
              account_code: '1930',
              account_name: 'Bankkonto',
              debit_amount: 15000.00,
              credit_amount: 0,
              description: 'Inbetalning från kund'
            },
            {
              transaction_id: transactions[1].id,
              account_code: '3000',
              account_name: 'Försäljning',
              debit_amount: 0,
              credit_amount: 15000.00,
              description: 'Konsultintäkter'
            }
          )
        }

        // Entries for third transaction (expense)
        if (transactions && transactions[2]) {
          sampleEntries.push(
            {
              transaction_id: transactions[2].id,
              account_code: '6212',
              account_name: 'Telefon',
              debit_amount: 299.00,
              credit_amount: 0,
              description: 'Månadsavgift telefon'
            },
            {
              transaction_id: transactions[2].id,
              account_code: '1930',
              account_name: 'Bankkonto',
              debit_amount: 0,
              credit_amount: 299.00,
              description: 'Betalning via bank'
            }
          )
        }

        if (sampleEntries.length > 0) {
          const { error: entriesError } = await supabaseAdmin
            .from('airledger_entries')
            .insert(sampleEntries)

          if (entriesError) {
            console.error('Error creating sample entries:', entriesError)
          } else {
            console.log('Sample entries created successfully')
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo user created successfully with sample data',
        user: {
          id: data.user?.id,
          email: data.user?.email
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in create-demo-user function:', error)
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