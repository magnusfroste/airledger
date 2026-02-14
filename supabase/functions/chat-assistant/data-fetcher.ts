import { UserData, VatSummary } from './types.ts';

function getCurrentQuarter(): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const q = Math.floor(month / 3);
  const qStart = new Date(year, q * 3, 1);
  const qEnd = new Date(year, q * 3 + 3, 0);
  return {
    start: qStart.toISOString().split('T')[0],
    end: qEnd.toISOString().split('T')[0],
    label: `Q${q + 1} ${year}`,
  };
}

async function fetchVatSummary(userId: string, supabase: any): Promise<VatSummary | undefined> {
  try {
    const quarter = getCurrentQuarter();
    const { data: vatEntries } = await supabase
      .from('airledger_entries')
      .select('account_code, debit_amount, credit_amount, airledger_transactions!inner(transaction_date, user_id)')
      .eq('airledger_transactions.user_id', userId)
      .gte('airledger_transactions.transaction_date', quarter.start)
      .lte('airledger_transactions.transaction_date', quarter.end);

    if (!vatEntries || vatEntries.length === 0) {
      return { outputVat: 0, inputVat: 0, netVat: 0, quarterLabel: quarter.label };
    }

    let outputVat = 0;
    let inputVat = 0;
    for (const entry of vatEntries) {
      const code = parseInt(entry.account_code);
      if (code >= 2610 && code <= 2619) {
        outputVat += (entry.credit_amount || 0) - (entry.debit_amount || 0);
      } else if (code >= 2640 && code <= 2649) {
        inputVat += (entry.debit_amount || 0) - (entry.credit_amount || 0);
      }
    }

    return { outputVat, inputVat, netVat: outputVat - inputVat, quarterLabel: quarter.label };
  } catch (err) {
    console.error('fetchVatSummary error:', err);
    return undefined;
  }
}

export async function fetchUserData(userId: string, supabase: any): Promise<UserData> {
  console.log('Fetching user transactions for user:', userId);
  const { data: transactions, error: transError } = await supabase
    .from('airledger_transactions')
    .select(`
      *,
      airledger_entries (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('Fetching opening balances for user:', userId);
  const { data: openingBalances, error: openingError } = await supabase
    .from('airledger_opening')
    .select('*')
    .eq('user_id', userId)
    .order('account_code', { ascending: true });

  console.log('Fetching chart of accounts');
  const { data: chartOfAccounts, error: chartError } = await supabase
    .from('airledger_chart_of_accounts')
    .select('account_code, account_name, account_type, normal_balance')
    .eq('is_active', true)
    .order('account_code', { ascending: true });

  if (chartError) {
    console.error('Error fetching chart of accounts:', chartError);
  }

  if (transError) {
    console.error('Error fetching transactions:', transError);
  } else {
    console.log('Found transactions:', transactions?.length || 0);
  }

  console.log('Fetching user profile');
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const userName = profile?.full_name || profile?.name || 'användare';
  const accountingMethod = profile?.accounting_method || 'accrual';

  console.log('Fetching transaction templates');
  const { data: templates, error: templatesError } = await supabase
    .from('airledger_transaction_templates')
    .select('template_name, description, category, keywords, usage_count, last_used_at, is_system_template, template_entries')
    .or(`is_system_template.eq.true,user_id.eq.${userId}`)
    .eq('auto_suggest', true)
    .order('usage_count', { ascending: false });

  if (templatesError) {
    console.error('Error fetching templates:', templatesError);
  }

  console.log('Fetched templates:', templates?.length || 0);

  // Fetch VAT summary for current quarter in parallel
  const vatSummary = await fetchVatSummary(userId, supabase);

  return {
    userId,
    userName,
    accountingMethod: accountingMethod as 'cash' | 'accrual',
    transactions: transactions || [],
    openingBalances: openingBalances || [],
    chartOfAccounts: chartOfAccounts || [],
    templates: templates || [],
    vatSummary,
  };
}