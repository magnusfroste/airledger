import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, TrendingDown, FileText, Download } from "lucide-react";
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

  const fetchReportData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Determine date range based on period
      let startDate = new Date();
      let endDate = new Date();
      
      switch (period) {
        case "current-month":
          startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          break;
        case "last-month":
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
          endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
          break;
        case "current-year":
          startDate = new Date(startDate.getFullYear(), 0, 1);
          endDate = new Date(startDate.getFullYear(), 11, 31);
          break;
        case "last-year":
          const lastYear = startDate.getFullYear() - 1;
          startDate = new Date(lastYear, 0, 1);
          endDate = new Date(lastYear, 11, 31);
          break;
      }

      // Fetch all entries for the period - using created_at like Dashboard
      const { data: entries, error } = await supabase
        .from('airledger_entries')
        .select(`
          account_code,
          account_name,
          debit_amount,
          credit_amount,
          created_at,
          airledger_transactions!inner(
            user_id
          )
        `)
        .eq('airledger_transactions.user_id', user.id)
        .gte('created_at', startDate.toISOString().split('T')[0])
        .lte('created_at', endDate.toISOString().split('T')[0]);

      if (error) {
        throw error;
      }

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

      // Separate revenue and expenses based on BAS account codes
      const revenue: Array<{ account_code: string; account_name: string; total: number }> = [];
      const expenses: Array<{ account_code: string; account_name: string; total: number }> = [];

      accountTotals.forEach(account => {
        const accountNum = parseInt(account.account_code);
        const netAmount = account.credit_total - account.debit_total;

        if (accountNum >= 3000 && accountNum <= 3999) {
          // Revenue accounts (3000-3999) - normal balance is credit
          if (netAmount !== 0) {
            revenue.push({
              account_code: account.account_code,
              account_name: account.account_name,
              total: netAmount
            });
          }
        } else if ((accountNum >= 4000 && accountNum <= 4999) || (accountNum >= 6000 && accountNum <= 6999)) {
          // Expense accounts (4000-4999, 6000-6999) - normal balance is debit
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

  const handleExport = () => {
    if (!reportData) return;

    // Create CSV content
    const csvLines = [];
    
    // Header
    csvLines.push('Resultatrapport');
    csvLines.push(`Period: ${getPeriodLabel()}`);
    csvLines.push(`Genererad: ${new Date().toLocaleDateString('sv-SE')}`);
    csvLines.push(''); // Empty line
    
    // Revenue section
    csvLines.push('INTÄKTER');
    csvLines.push('Konto,Kontonamn,Belopp');
    
    reportData.revenue.forEach(item => {
      csvLines.push(`${item.account_code},"${item.account_name}",${item.total.toFixed(2)}`);
    });
    
    csvLines.push(`SUMMA INTÄKTER,,${reportData.totalRevenue.toFixed(2)}`);
    csvLines.push(''); // Empty line
    
    // Expenses section
    csvLines.push('KOSTNADER');
    csvLines.push('Konto,Kontonamn,Belopp');
    
    reportData.expenses.forEach(item => {
      csvLines.push(`${item.account_code},"${item.account_name}",${item.total.toFixed(2)}`);
    });
    
    csvLines.push(`SUMMA KOSTNADER,,${reportData.totalExpenses.toFixed(2)}`);
    csvLines.push(''); // Empty line
    
    // Net result
    csvLines.push(`NETTORESULTAT,,${reportData.netResult.toFixed(2)}`);
    
    // Convert to CSV string
    const csvContent = csvLines.join('\n');
    
    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `resultatrapport_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export klar",
      description: "Resultatrapporten har exporterats som CSV-fil",
    });
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
    <div className="container px-6 py-6 max-w-6xl mx-auto animate-fade-in">
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
          
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportera
          </Button>
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