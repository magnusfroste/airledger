import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Filter, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Account {
  account_code: string;
  account_name: string;
  account_type: string;
  account_category: string;
  normal_balance: string;
}

interface OpeningBalance {
  account_code: string;
  account_name: string;
  opening_balance: number;
  balance_type: string;
}

interface AccountBalance {
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: number;
  debit_total: number;
  credit_total: number;
  current_balance: number;
  balance_type: string;
}

const GeneralLedger = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [filteredBalances, setFilteredBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accountBalances, searchTerm, filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch chart of accounts
      const { data: chartData, error: chartError } = await supabase
        .from('airledger_chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code');

      if (chartError) throw chartError;

      // Fetch opening balances
      const { data: openingData, error: openingError } = await supabase
        .from('airledger_opening')
        .select('*')
        .eq('user_id', user.id)
        .order('account_code');

      if (openingError) throw openingError;

      // Fetch transaction entries to calculate current balances
      const { data: entriesData, error: entriesError } = await supabase
        .from('airledger_entries')
        .select(`
          account_code,
          debit_amount,
          credit_amount,
          airledger_transactions!inner(user_id, status)
        `)
        .eq('airledger_transactions.user_id', user.id)
        .eq('airledger_transactions.status', 'posted');

      if (entriesError) throw entriesError;

      setAccounts(chartData || []);
      setOpeningBalances(openingData || []);
      
      // Calculate account balances
      calculateAccountBalances(chartData || [], openingData || [], entriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda huvudboksdata",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAccountBalances = (
    chartAccounts: Account[], 
    openingBals: OpeningBalance[], 
    entries: any[]
  ) => {
    const balances: AccountBalance[] = [];

    // Group entries by account code
    const entriesByAccount = entries.reduce((acc, entry) => {
      if (!acc[entry.account_code]) {
        acc[entry.account_code] = { debits: 0, credits: 0 };
      }
      acc[entry.account_code].debits += Number(entry.debit_amount || 0);
      acc[entry.account_code].credits += Number(entry.credit_amount || 0);
      return acc;
    }, {});

    // Create balance entries for all accounts with activity
    const accountsWithActivity = new Set([
      ...openingBals.map(ob => ob.account_code),
      ...Object.keys(entriesByAccount)
    ]);

    accountsWithActivity.forEach(accountCode => {
      const chartAccount = chartAccounts.find(acc => acc.account_code === accountCode);
      const openingBalance = openingBals.find(ob => ob.account_code === accountCode);
      const entries = entriesByAccount[accountCode] || { debits: 0, credits: 0 };

      if (!chartAccount && !openingBalance) return;

      const accountName = chartAccount?.account_name || openingBalance?.account_name || '';
      const accountType = chartAccount?.account_type || '';
      const normalBalance = chartAccount?.normal_balance || 'debit';
      const openingAmount = openingBalance?.opening_balance || 0;
      const openingBalanceType = openingBalance?.balance_type || normalBalance;

      // Calculate current balance based on account type
      let currentBalance = 0;
      if (normalBalance === 'debit') {
        // For debit accounts: Opening + Debits - Credits
        currentBalance = (openingBalanceType === 'debit' ? openingAmount : -openingAmount) + 
                        entries.debits - entries.credits;
      } else {
        // For credit accounts: Opening + Credits - Debits  
        currentBalance = (openingBalanceType === 'credit' ? openingAmount : -openingAmount) + 
                        entries.credits - entries.debits;
      }

      balances.push({
        account_code: accountCode,
        account_name: accountName,
        account_type: accountType,
        opening_balance: openingAmount,
        debit_total: entries.debits,
        credit_total: entries.credits,
        current_balance: currentBalance,
        balance_type: currentBalance >= 0 ? normalBalance : (normalBalance === 'debit' ? 'credit' : 'debit')
      });
    });

    // Sort by account code
    balances.sort((a, b) => a.account_code.localeCompare(b.account_code));
    setAccountBalances(balances);
  };

  const filterAccounts = () => {
    let filtered = accountBalances;

    if (searchTerm) {
      filtered = filtered.filter(account => 
        account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(account => account.account_type === filterType);
    }

    setFilteredBalances(filtered);
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-purple-100 text-purple-800';
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'asset': return 'Tillgång';
      case 'liability': return 'Skuld';
      case 'equity': return 'Eget kapital';
      case 'income': return 'Intäkt';
      case 'expense': return 'Kostnad';
      default: return type;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Huvudbok</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Laddar huvudbok...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Huvudbok</h1>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök konto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background"
            >
              <option value="all">Alla kontotyper</option>
              <option value="asset">Tillgångar</option>
              <option value="liability">Skulder</option>
              <option value="equity">Eget kapital</option>
              <option value="income">Intäkter</option>
              <option value="expense">Kostnader</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Account Balances */}
      <div className="space-y-4">
        {filteredBalances.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Inga konton hittades</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterType !== 'all' 
                  ? "Inga konton matchar dina sökkriterier"
                  : "Inga konton med aktivitet eller ingående balanser"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredBalances.map((account) => (
            <Card key={account.account_code} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {account.account_code} - {account.account_name}
                      </h3>
                      {account.account_type && (
                        <Badge className={getAccountTypeColor(account.account_type)}>
                          {getAccountTypeName(account.account_type)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Ingående balans:</span>
                        <div className="font-medium">
                          {formatAmount(account.opening_balance)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total debet:</span>
                        <div className="font-medium">
                          {formatAmount(account.debit_total)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total kredit:</span>
                        <div className="font-medium">
                          {formatAmount(account.credit_total)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Aktuellt saldo:</span>
                        <div className={`font-bold text-lg ${
                          account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatAmount(Math.abs(account.current_balance))}
                          {account.current_balance < 0 && (
                            <span className="text-xs ml-1">
                              ({account.balance_type === 'debit' ? 'Kredit' : 'Debet'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Sammanfattning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {filteredBalances.length}
              </div>
              <div className="text-sm text-muted-foreground">Aktiva konton</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(filteredBalances.reduce((sum, acc) => sum + acc.debit_total, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total debet</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatAmount(filteredBalances.reduce((sum, acc) => sum + acc.credit_total, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total kredit</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralLedger;