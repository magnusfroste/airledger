import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Building, Banknote, Calculator, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
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
interface BalanceSheetAccount {
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: number;
  current_balance: number;
  change: number;
}
interface BalanceSheetData {
  assets: BalanceSheetAccount[];
  liabilities: BalanceSheetAccount[];
  equity: BalanceSheetAccount[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}
const BalanceSheet = () => {
  const [balanceData, setBalanceData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceDate, setBalanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['assets', 'liabilities', 'equity']));
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const fetchBalanceSheetData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch chart of accounts
      const {
        data: chartData,
        error: chartError
      } = await supabase.from('airledger_chart_of_accounts').select('*').eq('is_active', true).order('account_code');
      if (chartError) throw chartError;

      // Fetch opening balances
      const {
        data: openingData,
        error: openingError
      } = await supabase.from('airledger_opening').select('*').eq('user_id', user.id).order('account_code');
      if (openingError) throw openingError;

      // Fetch transaction entries up to the selected date
      const {
        data: entriesData,
        error: entriesError
      } = await supabase.from('airledger_entries').select(`
          account_code,
          debit_amount,
          credit_amount,
          airledger_transactions!inner(
            user_id,
            transaction_date
          )
        `).eq('airledger_transactions.user_id', user.id).lte('airledger_transactions.transaction_date', balanceDate);
      if (entriesError) throw entriesError;

      // Calculate balance sheet data
      calculateBalanceSheet(chartData || [], openingData || [], entriesData || []);
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda balansrapportdata",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const calculateBalanceSheet = (chartAccounts: Account[], openingBals: OpeningBalance[], entries: any[]) => {
    // Group entries by account code
    const entriesByAccount = entries.reduce((acc, entry) => {
      if (!acc[entry.account_code]) {
        acc[entry.account_code] = {
          debits: 0,
          credits: 0
        };
      }
      acc[entry.account_code].debits += Number(entry.debit_amount || 0);
      acc[entry.account_code].credits += Number(entry.credit_amount || 0);
      return acc;
    }, {});
    const assets: BalanceSheetAccount[] = [];
    const liabilities: BalanceSheetAccount[] = [];
    const equity: BalanceSheetAccount[] = [];

    // Get all accounts with opening balances or activity
    const accountsWithActivity = new Set([...openingBals.map(ob => ob.account_code), ...Object.keys(entriesByAccount)]);
    accountsWithActivity.forEach(accountCode => {
      const chartAccount = chartAccounts.find(acc => acc.account_code === accountCode);
      const openingBalance = openingBals.find(ob => ob.account_code === accountCode);
      const entries = entriesByAccount[accountCode] || {
        debits: 0,
        credits: 0
      };
      if (!chartAccount && !openingBalance) return;
      const accountName = chartAccount?.account_name || openingBalance?.account_name || '';
      const accountType = chartAccount?.account_type || '';
      const normalBalance = chartAccount?.normal_balance || 'debit';
      const openingAmount = openingBalance?.opening_balance || 0;
      const openingBalanceType = openingBalance?.balance_type || normalBalance;

      // Calculate current balance
      let currentBalance = 0;
      if (normalBalance === 'debit') {
        currentBalance = (openingBalanceType === 'debit' ? openingAmount : -openingAmount) + entries.debits - entries.credits;
      } else {
        currentBalance = (openingBalanceType === 'credit' ? openingAmount : -openingAmount) + entries.credits - entries.debits;
      }
      const change = currentBalance - openingAmount;
      const balanceAccount: BalanceSheetAccount = {
        account_code: accountCode,
        account_name: accountName,
        account_type: accountType,
        opening_balance: openingAmount,
        current_balance: Math.abs(currentBalance),
        change: change
      };

      // Categorize based on account_type from database
      if (accountType === 'asset') {
        assets.push(balanceAccount);
      } else if (accountType === 'liability') {
        liabilities.push(balanceAccount);
      } else if (accountType === 'equity') {
        equity.push(balanceAccount);
      }
    });

    // Sort by account code
    assets.sort((a, b) => a.account_code.localeCompare(b.account_code));
    liabilities.sort((a, b) => a.account_code.localeCompare(b.account_code));
    equity.sort((a, b) => a.account_code.localeCompare(b.account_code));
    const totalAssets = assets.reduce((sum, acc) => sum + acc.current_balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.current_balance, 0);
    const totalEquity = equity.reduce((sum, acc) => sum + acc.current_balance, 0);

    // Check if balance sheet is balanced (Assets = Liabilities + Equity)
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;
    setBalanceData({
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced
    });
  };
  useEffect(() => {
    fetchBalanceSheetData();
  }, [user, balanceDate]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (expandedSections.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  const renderAccountSection = (title: string, sectionKey: string, accounts: BalanceSheetAccount[], total: number, icon: React.ReactNode, colorClass: string) => {
    const isExpanded = expandedSections.has(sectionKey);
    return <Card className="hover-scale">
        <CardHeader className="cursor-pointer select-none" onClick={() => toggleSection(sectionKey)}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <span>{title}</span>
              <Badge variant="outline" className={colorClass}>
                {formatCurrency(total)}
              </Badge>
            </div>
            {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        
        {isExpanded && <CardContent className="pt-0">
            {accounts.length === 0 ? <p className="text-muted-foreground text-sm py-4">
                Inga konton registrerade i denna kategori
              </p> : <div className="space-y-3">
                {accounts.map(account => <div key={account.account_code} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {account.account_code} {account.account_name}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>IB: {formatCurrency(account.opening_balance)}</span>
                        <span className={`flex items-center gap-1 ${account.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {account.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {account.change >= 0 ? '+' : ''}{formatCurrency(account.change)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(account.current_balance)}
                      </div>
                    </div>
                  </div>)}
              </div>}
          </CardContent>}
      </Card>;
  };
  if (loading) {
    return <div className="container px-6 py-6 max-w-4xl mx-auto">
        <div className="animate-fade-in space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="grid gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />)}
          </div>
        </div>
      </div>;
  }
  return <div className="container py-6 pb-20 sm:pb-6 max-w-4xl mx-auto animate-fade-in px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
            <Scale className="h-7 w-7 text-primary" />
            Balansrapport
          </h1>
          <p className="text-muted-foreground mt-1">
            Finansiell ställning per {format(new Date(balanceDate), 'PPP', {
            locale: sv
          })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <input type="date" value={balanceDate} onChange={e => setBalanceDate(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background text-sm" />
        </div>
      </div>

      {/* Balance Check */}
      <Card className={`mb-6 ${balanceData?.isBalanced ? 'border-green-200' : 'border-red-200'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {balanceData?.isBalanced ? <CheckCircle className="h-6 w-6 text-green-600" /> : <AlertCircle className="h-6 w-6 text-red-600" />}
              <div>
                <h3 className="font-semibold">
                  {balanceData?.isBalanced ? 'Balanserad' : 'Ej balanserad'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tillgångar {balanceData?.isBalanced ? '=' : '≠'} Skulder + Eget kapital
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Differens</div>
              <div className={`font-semibold ${balanceData?.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs((balanceData?.totalAssets || 0) - ((balanceData?.totalLiabilities || 0) + (balanceData?.totalEquity || 0))))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover-scale border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totala tillgångar</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(balanceData?.totalAssets || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totala skulder</CardTitle>
            <Banknote className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(balanceData?.totalLiabilities || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eget kapital</CardTitle>
            <Calculator className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(balanceData?.totalEquity || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Sheet Sections */}
      <div className="space-y-6">
        {renderAccountSection("Tillgångar", "assets", balanceData?.assets || [], balanceData?.totalAssets || 0, <Building className="h-5 w-5 text-blue-600" />, "text-blue-600 border-blue-200")}

        {renderAccountSection("Skulder", "liabilities", balanceData?.liabilities || [], balanceData?.totalLiabilities || 0, <Banknote className="h-5 w-5 text-red-600" />, "text-red-600 border-red-200")}

        {renderAccountSection("Eget kapital", "equity", balanceData?.equity || [], balanceData?.totalEquity || 0, <Calculator className="h-5 w-5 text-purple-600" />, "text-purple-600 border-purple-200")}
      </div>
    </div>;
};
export default BalanceSheet;