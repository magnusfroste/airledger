import { UserData } from './types.ts';

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

  return {
    userId,
    userName,
    transactions: transactions || [],
    openingBalances: openingBalances || [],
    chartOfAccounts: chartOfAccounts || []
  };
}