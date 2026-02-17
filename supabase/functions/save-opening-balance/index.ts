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
    console.log('Save opening balance function called')
    const { accountCode, accountName, amount } = await req.json()

    if (!accountCode || !accountName || amount === undefined) {
      throw new Error('Account code, name and amount are required')
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
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Authentication failed')
    }

    console.log('Saving opening balance for user:', user.id)

    // Determine balance type based on account code (BAS 2024)
    const accountCodeNum = parseInt(accountCode)
    let balanceType = 'debit'
    
    if (accountCodeNum >= 1000 && accountCodeNum <= 1999) {
      // Tillgångar (Assets) - normal balance is debit
      balanceType = amount >= 0 ? 'debit' : 'credit'
    } else if (accountCodeNum >= 2000 && accountCodeNum <= 2999) {
      // Skulder (Liabilities) - normal balance is credit
      balanceType = amount >= 0 ? 'credit' : 'debit'
    } else if (accountCodeNum >= 3000 && accountCodeNum <= 3999) {
      // Intäkter (Revenue) - normal balance is credit
      balanceType = amount >= 0 ? 'credit' : 'debit'
    } else if (accountCodeNum >= 4000 && accountCodeNum <= 4999 || accountCodeNum >= 6000 && accountCodeNum <= 6999) {
      // Kostnader (Expenses) - normal balance is debit
      balanceType = amount >= 0 ? 'debit' : 'credit'
    } else {
      // For other accounts, use debit as default
      balanceType = amount >= 0 ? 'debit' : 'credit'
    }

    // Save opening balance (upsert)
    const { data, error } = await supabase
      .from('airledger_opening')
      .upsert({
        user_id: user.id,
        account_code: accountCode,
        account_name: accountName,
        opening_balance: Math.abs(amount),
        balance_type: balanceType,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,account_code'
      })
      .select()

    if (error) {
      console.error('Error saving opening balance:', error)
      throw new Error('Failed to save opening balance')
    }

    console.log('Opening balance saved successfully')

    return new Response(
      JSON.stringify({
        success: true,
        opening_balance: data[0]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in save-opening-balance function:', error)
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'An unexpected error occurred',
        success: false 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})