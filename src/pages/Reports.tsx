import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ReportData {
  revenue: Array<{
    account_code: string;
    account_name: string;
    total: number;
  }>;
  expenses: Array<{
    account_code: string;
    account_name: string;
    total: number;
  }>;
  totalRevenue: number;
  totalExpenses: number;
  netResult: number;
}

const Reports = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("current-year");
  const { user } = useAuth();
  const { toast } = useToast();

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchReportData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Determine date range based on period
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      switch (period) {
        case "current-month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case "last-month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case "current-year":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        case "last-year":
          const lastYear = now.getFullYear() - 1;
          startDate = new Date(lastYear, 0, 1);
          endDate = new Date(lastYear, 11, 31);
          break;
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
      }

      // Fetch all entries for the period with transaction date
      const { data: entries, error } = await supabase
        .from('airledger_entries')
        .select(`
          account_code,
          account_name,
          debit_amount,
          credit_amount,
          airledger_transactions!inner(
            user_id,
            transaction_date
          )
        `)
        .eq('airledger_transactions.user_id', user.id)
        .gte('airledger_transactions.transaction_date', formatLocalDate(startDate))
        .lte('airledger_transactions.transaction_date', formatLocalDate(endDate));

      if (error) {
        throw error;
      }

      // Fetch chart of accounts to get account_type
      const { data: chartAccounts, error: chartError } = await supabase
        .from('airledger_chart_of_accounts')
        .select('account_code, account_type')
        .eq('is_active', true);

      if (chartError) throw chartError;

      const accountTypeMap = new Map<string, string>();
      chartAccounts?.forEach(a => accountTypeMap.set(a.account_code, a.account_type || ''));

      // Group entries by account and calculate totals
      const accountTotals = new Map<string, {
        account_code: string;
        account_name: string;
        debit_total: number;
        credit_total: number;
      }>();

      entries?.forEach(entry => {
        const key = `${entry.account_code}-${entry.account_name}`;
        const existing = accountTotals.get(key) || {
          account_code: entry.account_code,
          account_name: entry.account_name,
          debit_total: 0,
          credit_total: 0
        };

        existing.debit_total += Number(entry.debit_amount || 0);
        existing.credit_total += Number(entry.credit_amount || 0);
        accountTotals.set(key, existing);
      });

      // Classify using account_type from chart of accounts
      // Fallback: 3xxx = income, 4xxx-8xxx = expense (for accounts not in chart)
      const revenue: Array<{ account_code: string; account_name: string; total: number }> = [];
      const expenses: Array<{ account_code: string; account_name: string; total: number }> = [];

      accountTotals.forEach(account => {
        const accountNum = parseInt(account.account_code);
        const type = accountTypeMap.get(account.account_code);

        // Skip balance sheet accounts (class 1-2)
        if (accountNum < 3000) return;

        const isIncome = type === 'income' || (!type && accountNum >= 3000 && accountNum < 4000);

        if (isIncome) {
          const netAmount = account.credit_total - account.debit_total;
          if (netAmount !== 0) {
            revenue.push({
              account_code: account.account_code,
              account_name: account.account_name,
              total: netAmount
            });
          }
        } else {
          // expense (4xxx-8xxx)
          const expenseAmount = account.debit_total - account.credit_total;
          if (expenseAmount !== 0) {
            expenses.push({
              account_code: account.account_code,
              account_name: account.account_name,
              total: expenseAmount
            });
          }
        }
      });

      // Sort by account code
      revenue.sort((a, b) => a.account_code.localeCompare(b.account_code));
      expenses.sort((a, b) => a.account_code.localeCompare(b.account_code));

      const totalRevenue = revenue.reduce((sum, item) => sum + item.total, 0);
      const totalExpenses = expenses.reduce((sum, item) => sum + item.total, 0);
      const netResult = totalRevenue - totalExpenses;

      setReportData({
        revenue,
        expenses,
        totalRevenue,
        totalExpenses,
        netResult
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta rapportdata. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [user, period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "current-month": return "Innevarande månad";
      case "last-month": return "Föregående månad";
      case "current-year": return "Innevarande år";
      case "last-year": return "Föregående år";
      default: return "Innevarande år";
    }
  };


  if (loading) {
    return (
      <div className="container px-6 py-6 max-w-6xl mx-auto">
        <div className="animate-fade-in space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-6 py-6 pb-20 sm:pb-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Resultatrapport</h1>
          <p className="text-muted-foreground mt-1">
            Översikt över intäkter och kostnader • {getPeriodLabel()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Innevarande månad</SelectItem>
              <SelectItem value="last-month">Föregående månad</SelectItem>
              <SelectItem value="current-year">Innevarande år</SelectItem>
              <SelectItem value="last-year">Föregående år</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totala intäkter</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(reportData?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totala kostnader</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData?.totalExpenses || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nettoresultat</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (reportData?.netResult || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(reportData?.netResult || 0)}
            </div>
            <Badge 
              variant={(reportData?.netResult || 0) >= 0 ? "default" : "destructive"}
              className="mt-2"
            >
              {(reportData?.netResult || 0) >= 0 ? 'Vinst' : 'Förlust'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Intäkter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData?.revenue && reportData.revenue.length > 0 ? (
                reportData.revenue.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border/20 last:border-b-0">
                    <div>
                      <div className="font-medium text-sm">{item.account_code} {item.account_name}</div>
                    </div>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Inga intäkter registrerade för denna period</p>
              )}
              
              {reportData?.revenue && reportData.revenue.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-border font-semibold">
                  <span>Total intäkter</span>
                  <span className="text-green-600">{formatCurrency(reportData.totalRevenue)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Kostnader
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData?.expenses && reportData.expenses.length > 0 ? (
                reportData.expenses.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border/20 last:border-b-0">
                    <div>
                      <div className="font-medium text-sm">{item.account_code} {item.account_name}</div>
                    </div>
                    <div className="font-semibold text-red-600">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Inga kostnader registrerade för denna period</p>
              )}
              
              {reportData?.expenses && reportData.expenses.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-border font-semibold">
                  <span>Total kostnader</span>
                  <span className="text-red-600">{formatCurrency(reportData.totalExpenses)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;