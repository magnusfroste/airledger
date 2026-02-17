import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getAccountType(code: number): { type: string; category: string; normalBalance: string } {
  if (code >= 1000 && code <= 1999) return { type: 'asset', category: 'Tillgångar', normalBalance: 'debit' };
  if (code >= 2000 && code <= 2099) return { type: 'equity', category: 'Eget kapital', normalBalance: 'credit' };
  if (code >= 2100 && code <= 2999) return { type: 'liability', category: 'Skulder', normalBalance: 'credit' };
  if (code >= 3000 && code <= 3999) return { type: 'income', category: 'Intäkter', normalBalance: 'credit' };
  if (code >= 4000 && code <= 4999) return { type: 'expense', category: 'Varuinköp', normalBalance: 'debit' };
  if (code >= 5000 && code <= 6999) return { type: 'expense', category: 'Övriga kostnader', normalBalance: 'debit' };
  if (code >= 7000 && code <= 7999) return { type: 'expense', category: 'Personal & avskrivningar', normalBalance: 'debit' };
  if (code >= 8000 && code <= 8799) return { type: 'financial', category: 'Finansiella poster', normalBalance: 'debit' };
  if (code >= 8800 && code <= 8899) return { type: 'financial', category: 'Bokslutsdispositioner', normalBalance: 'debit' };
  if (code >= 8900 && code <= 8999) return { type: 'financial', category: 'Skatter & resultat', normalBalance: 'debit' };
  return { type: 'other', category: 'Övrigt', normalBalance: 'debit' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { csvUrl } = await req.json()
    if (!csvUrl) throw new Error('csvUrl is required')

    // Fetch CSV from URL
    const csvResponse = await fetch(csvUrl)
    if (!csvResponse.ok) throw new Error(`Failed to fetch CSV: ${csvResponse.status}`)
    const csvContent = await csvResponse.text()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const lines = csvContent.split('\n')
    const accounts: any[] = []
    const seenCodes = new Set<string>()

    for (const line of lines) {
      const cols = line.split(';')
      if (cols.length >= 8) {
        const code = cols[6]?.trim()
        const name = cols[7]?.trim()?.replace(/\|/g, '').replace(/\*/g, '')
        
        if (code && name && /^\d{4}$/.test(code) && !seenCodes.has(code)) {
          seenCodes.add(code)
          const codeNum = parseInt(code)
          const { type, category, normalBalance } = getAccountType(codeNum)
          accounts.push({
            account_code: code,
            account_name: name,
            account_type: type,
            account_category: category,
            normal_balance: normalBalance,
            is_active: true,
          })
        }
      }
    }

    console.log(`Parsed ${accounts.length} accounts from CSV`)

    // Insert in batches of 100
    let inserted = 0
    for (let i = 0; i < accounts.length; i += 100) {
      const batch = accounts.slice(i, i + 100)
      const { error } = await supabase
        .from('airledger_chart_of_accounts')
        .upsert(batch, { onConflict: 'account_code' })
      
      if (error) {
        console.error(`Batch error at ${i}:`, error)
        throw error
      }
      inserted += batch.length
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Import error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message, success: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
