import { UserData, VatSummary, AccountBalance, VendorPattern, TemplatePreference } from './types.ts';

function getCurrentQuarter(): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
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

/**
 * Calculate current balance per account: IB + sum(debit) - sum(credit)
 * Only returns accounts with activity (non-zero balance).
 */
async function fetchAccountBalances(userId: string, supabase: any): Promise<AccountBalance[]> {
  try {
    // Fetch opening balances
    const { data: openings } = await supabase
      .from('airledger_opening')
      .select('account_code, account_name, opening_balance, balance_type')
      .eq('user_id', userId);

    // Fetch all entry sums grouped by account
    const { data: entries } = await supabase
      .from('airledger_entries')
      .select('account_code, account_name, debit_amount, credit_amount, airledger_transactions!inner(user_id)')
      .eq('airledger_transactions.user_id', userId);

    // Build balance map: account_code -> { debit_sum, credit_sum, name }
    const balanceMap: Record<string, { debit: number; credit: number; name: string }> = {};

    // Add opening balances
    for (const ob of openings || []) {
      if (!balanceMap[ob.account_code]) {
        balanceMap[ob.account_code] = { debit: 0, credit: 0, name: ob.account_name };
      }
      if (ob.balance_type === 'debit') {
        balanceMap[ob.account_code].debit += ob.opening_balance || 0;
      } else {
        balanceMap[ob.account_code].credit += ob.opening_balance || 0;
      }
    }

    // Add transaction entries
    for (const entry of entries || []) {
      if (!balanceMap[entry.account_code]) {
        balanceMap[entry.account_code] = { debit: 0, credit: 0, name: entry.account_name };
      }
      balanceMap[entry.account_code].debit += entry.debit_amount || 0;
      balanceMap[entry.account_code].credit += entry.credit_amount || 0;
    }

    // Calculate net balances, only include non-zero
    const results: AccountBalance[] = [];
    for (const [code, data] of Object.entries(balanceMap)) {
      const net = data.debit - data.credit;
      if (Math.abs(net) < 0.01) continue;
      const classDigit = code.charAt(0);
      // Class 1, 5-9: normal debit; Class 2-4: normal credit (simplified)
      const normalBalance = ['1', '5', '6', '7', '8', '9'].includes(classDigit) ? 'debit' : 'credit';
      results.push({
        account_code: code,
        account_name: data.name,
        balance: Math.abs(net),
        normal_balance: net >= 0 ? 'debit' : 'credit',
      });
    }

    results.sort((a, b) => a.account_code.localeCompare(b.account_code));
    return results;
  } catch (err) {
    console.error('fetchAccountBalances error:', err);
    return [];
  }
}

/**
 * Extract vendor patterns: which vendor → which template, average amount, frequency.
 * Derived from transaction descriptions + template_usage join.
 */
async function fetchVendorPatterns(userId: string, supabase: any): Promise<VendorPattern[]> {
  try {
    const { data: usage } = await supabase
      .from('airledger_template_usage')
      .select('template_name, used_at, airledger_transactions!inner(description, total_amount, transaction_date)')
      .eq('user_id', userId)
      .order('used_at', { ascending: false })
      .limit(200);

    if (!usage || usage.length === 0) return [];

    // Group by normalized vendor (first word of description) + template
    const vendorMap: Record<string, { amounts: number[]; template: string; lastDate: string }> = {};
    for (const u of usage) {
      const tx = u.airledger_transactions;
      if (!tx?.description) continue;
      // Use first meaningful part of description as vendor key
      const vendor = tx.description.split(/\s+/).slice(0, 2).join(' ').toLowerCase();
      const key = `${vendor}::${u.template_name}`;
      if (!vendorMap[key]) {
        vendorMap[key] = { amounts: [], template: u.template_name, lastDate: tx.transaction_date };
      }
      vendorMap[key].amounts.push(Number(tx.total_amount) || 0);
      if (tx.transaction_date > vendorMap[key].lastDate) {
        vendorMap[key].lastDate = tx.transaction_date;
      }
    }

    const patterns: VendorPattern[] = [];
    for (const [key, data] of Object.entries(vendorMap)) {
      if (data.amounts.length < 2) continue; // Only patterns with 2+ occurrences
      const vendor = key.split('::')[0];
      const avg = data.amounts.reduce((s, v) => s + v, 0) / data.amounts.length;
      patterns.push({
        vendor,
        template_name: data.template,
        avg_amount: Math.round(avg),
        count: data.amounts.length,
        last_date: data.lastDate,
      });
    }

    patterns.sort((a, b) => b.count - a.count);
    return patterns.slice(0, 15); // Top 15 patterns
  } catch (err) {
    console.error('fetchVendorPatterns error:', err);
    return [];
  }
}

/**
 * Extract template preferences: most used templates for this user.
 */
async function fetchTemplatePreferences(userId: string, supabase: any): Promise<TemplatePreference[]> {
  try {
    const { data: usage } = await supabase
      .from('airledger_template_usage')
      .select('template_name, used_at')
      .eq('user_id', userId)
      .order('used_at', { ascending: false })
      .limit(500);

    if (!usage || usage.length === 0) return [];

    const countMap: Record<string, { count: number; lastUsed: string }> = {};
    for (const u of usage) {
      if (!countMap[u.template_name]) {
        countMap[u.template_name] = { count: 0, lastUsed: u.used_at };
      }
      countMap[u.template_name].count++;
      if (u.used_at > countMap[u.template_name].lastUsed) {
        countMap[u.template_name].lastUsed = u.used_at;
      }
    }

    return Object.entries(countMap)
      .map(([name, data]) => ({ template_name: name, usage_count: data.count, last_used: data.lastUsed }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);
  } catch (err) {
    console.error('fetchTemplatePreferences error:', err);
    return [];
  }
}

export async function fetchUserData(userId: string, supabase: any): Promise<UserData> {
  console.log('Fetching user data for:', userId);

  // Run all queries in parallel
  const [
    transResult,
    openingResult,
    chartResult,
    profileResult,
    templatesResult,
    vatSummary,
    accountBalances,
    vendorPatterns,
    templatePreferences,
  ] = await Promise.all([
    supabase
      .from('airledger_transactions')
      .select('*, airledger_entries (*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('airledger_opening')
      .select('*')
      .eq('user_id', userId)
      .order('account_code', { ascending: true }),
    supabase
      .from('airledger_chart_of_accounts')
      .select('account_code, account_name, account_type, normal_balance')
      .eq('is_active', true)
      .order('account_code', { ascending: true }),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    supabase
      .from('airledger_transaction_templates')
      .select('template_name, description, category, keywords, usage_count, last_used_at, is_system_template, template_entries')
      .or(`is_system_template.eq.true,user_id.eq.${userId}`)
      .eq('auto_suggest', true)
      .order('usage_count', { ascending: false }),
    fetchVatSummary(userId, supabase),
    fetchAccountBalances(userId, supabase),
    fetchVendorPatterns(userId, supabase),
    fetchTemplatePreferences(userId, supabase),
  ]);

  if (transResult.error) console.error('Error fetching transactions:', transResult.error);
  if (chartResult.error) console.error('Error fetching chart of accounts:', chartResult.error);
  if (templatesResult.error) console.error('Error fetching templates:', templatesResult.error);

  const profile = profileResult.data;
  const userName = profile?.full_name || profile?.name || 'användare';
  const accountingMethod = profile?.accounting_method || 'accrual';

  console.log('Fetched:', {
    transactions: transResult.data?.length || 0,
    templates: templatesResult.data?.length || 0,
    accountBalances: accountBalances.length,
    vendorPatterns: vendorPatterns.length,
    templatePreferences: templatePreferences.length,
  });

  return {
    userId,
    userName,
    accountingMethod: accountingMethod as 'cash' | 'accrual',
    transactions: transResult.data || [],
    openingBalances: openingResult.data || [],
    chartOfAccounts: chartResult.data || [],
    templates: templatesResult.data || [],
    vatSummary,
    accountBalances,
    vendorPatterns,
    templatePreferences,
  };
}
