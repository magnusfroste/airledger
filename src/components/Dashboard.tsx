import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";
import { 
  MessageCircle, 
  Camera, 
  TrendingUp, 
  TrendingDown,
  FileText, 
  Plus, 
  DollarSign,
  CreditCard,
  AlertCircle,
  Receipt,
  Calendar
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  revenue: number;
  expenses: number;
  checkingBalance: number;
  unpaidInvoices: number;
}

interface YearlyStats {
  revenue: number;
  expenses: number;
  netResult: number;
  monthlyBreakdown: Array<{
    month: string;
    revenue: number;
    expenses: number;
    netResult: number;
  }>;
}

interface RecentTransaction {
  id: string;
  description: string;
  total_amount: number;
  transaction_date: string;
  transaction_type: string;
  vendor?: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    expenses: 0,
    checkingBalance: 0,
    unpaidInvoices: 0
  });
  const [yearlyStats, setYearlyStats] = useState<YearlyStats>({
    revenue: 0,
    expenses: 0,
    netResult: 0,
    monthlyBreakdown: []
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "God morgon";
    if (hour < 17) return "God middag";
    return "God kväll";
  });

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Användare';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all transactions and entries in parallel
      const [transactionsResult, entriesResult] = await Promise.all([
        supabase
          .from('airledger_transactions')
          .select('*')
          .order('transaction_date', { ascending: false }),
        supabase
          .from('airledger_entries')
          .select('*')
      ]);

      if (transactionsResult.error) throw transactionsResult.error;
      if (entriesResult.error) throw entriesResult.error;

      const transactions = transactionsResult.data || [];
      const entries = entriesResult.data || [];

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // MONTHLY DATA
      // Revenue - only from sales (3000 account), not payments
      const monthlyRevenue = entries
        .filter(e => {
          const entryDate = new Date(e.created_at);
          return e.account_code === '3000' && 
                 entryDate.getMonth() === currentMonth && 
                 entryDate.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + (e.credit_amount || 0), 0);

      // Expenses - posted expense transactions this month
      const monthlyExpenses = transactions
        .filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return t.transaction_type === 'expense' && 
                 t.status === 'posted' &&
                 transactionDate.getMonth() === currentMonth &&
                 transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.total_amount, 0);

      // Checking account balance (1930) - include opening balance + transactions
      const checkingOpeningBalance = await supabase
        .from('airledger_opening')
        .select('opening_balance')
        .eq('account_code', '1930')
        .single();
      
      const checkingTransactions = entries
        .filter(e => e.account_code === '1930')
        .reduce((sum, e) => sum + (e.debit_amount || 0) - (e.credit_amount || 0), 0);
      
      const checkingBalance = (checkingOpeningBalance.data?.opening_balance || 0) + checkingTransactions;

      // Unpaid invoices - customer receivables (1510) minus any advance payments
      const customerReceivables = entries
        .filter(e => e.account_code === '1510')
        .reduce((sum, e) => sum + (e.debit_amount || 0) - (e.credit_amount || 0), 0);

      setStats({
        revenue: monthlyRevenue,
        expenses: Math.abs(monthlyExpenses),
        checkingBalance,
        unpaidInvoices: Math.max(customerReceivables, 0)
      });

      // YEARLY DATA
      // Calculate yearly totals and monthly breakdown
      const yearlyRevenue = entries
        .filter(e => {
          const entryDate = new Date(e.created_at);
          return e.account_code === '3000' && entryDate.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + (e.credit_amount || 0), 0);

      const yearlyExpenses = transactions
        .filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return t.transaction_type === 'expense' && 
                 t.status === 'posted' &&
                 transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.total_amount, 0);

      // Create monthly breakdown for charts
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
        'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
      ];

      const monthlyBreakdown = monthNames.map((month, index) => {
        const monthRevenue = entries
          .filter(e => {
            const entryDate = new Date(e.created_at);
            return e.account_code === '3000' && 
                   entryDate.getMonth() === index && 
                   entryDate.getFullYear() === currentYear;
          })
          .reduce((sum, e) => sum + (e.credit_amount || 0), 0);

        const monthExpenses = transactions
          .filter(t => {
            const transactionDate = new Date(t.transaction_date);
            return t.transaction_type === 'expense' && 
                   t.status === 'posted' &&
                   transactionDate.getMonth() === index &&
                   transactionDate.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + t.total_amount, 0);

        return {
          month,
          revenue: monthRevenue,
          expenses: Math.abs(monthExpenses),
          netResult: monthRevenue - Math.abs(monthExpenses)
        };
      });

      setYearlyStats({
        revenue: yearlyRevenue,
        expenses: Math.abs(yearlyExpenses),
        netResult: yearlyRevenue - Math.abs(yearlyExpenses),
        monthlyBreakdown
      });

      // Get recent transactions (last 5)
      const recent = transactions
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          description: t.description,
          total_amount: t.total_amount,
          transaction_date: t.transaction_date,
          transaction_type: t.transaction_type,
          vendor: typeof t.analysis_data === 'object' && t.analysis_data !== null && 'vendor' in t.analysis_data 
            ? String(t.analysis_data.vendor) 
            : undefined
        }));

      setRecentTransactions(recent);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Fel vid laddning",
        description: "Kunde inte hämta dashboard-data. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Laddar dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {greeting}, {userName}! 👋
              </h1>
              <p className="text-gray-600 mt-1">Här är din ekonomiska översikt</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button asChild>
                <Link to="/chat">
                  <Camera className="h-4 w-4 mr-2" />
                  Fotografera kvitto
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="month" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="month" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Denna månad
            </TabsTrigger>
            <TabsTrigger value="year" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hela året {new Date().getFullYear()}
            </TabsTrigger>
          </TabsList>

          {/* Monthly View */}
          <TabsContent value="month" className="space-y-8">
            {/* Monthly Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Revenue */}
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Försäljning denna månad</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenue)}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Kostnader denna månad</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.expenses)}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Checking Balance */}
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saldo checkkonto</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.checkingBalance)}</p>
                      <p className="text-xs text-gray-500 mt-1">Konto 1930</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Unpaid Invoices */}
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Obetalda fakturor</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.unpaidInvoices)}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Net Result Card */}
            <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Nettoresultat denna månad</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(stats.revenue - stats.expenses)}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Yearly View */}
          <TabsContent value="year" className="space-y-8">
            {/* Yearly Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Yearly Revenue */}
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total försäljning {new Date().getFullYear()}</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(yearlyStats.revenue)}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Yearly Expenses */}
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total kostnader {new Date().getFullYear()}</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(yearlyStats.expenses)}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Yearly Net Result */}
              <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Nettoresultat {new Date().getFullYear()}</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(yearlyStats.netResult)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Breakdown Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Revenue & Expenses Bar Chart */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Månatlig översikt</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Försäljning",
                        color: "hsl(142, 76%, 36%)",
                      },
                      expenses: {
                        label: "Kostnader",
                        color: "hsl(0, 84%, 60%)",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={yearlyStats.monthlyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar dataKey="revenue" fill="var(--color-revenue)" name="Försäljning" />
                        <Bar dataKey="expenses" fill="var(--color-expenses)" name="Kostnader" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Net Result Line Chart */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Nettoresultat per månad</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      netResult: {
                        label: "Nettoresultat",
                        color: "hsl(217, 91%, 60%)",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={yearlyStats.monthlyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="netResult" 
                          stroke="var(--color-netResult)" 
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          name="Nettoresultat"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Recent Transactions - Always visible */}
        <Card className="bg-white border border-gray-200 mt-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Senaste transaktioner</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/transactions">
                  <FileText className="h-4 w-4 mr-2" />
                  Visa alla
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.transaction_type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <Receipt className={`h-5 w-5 ${
                          transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.transaction_date)}
                          {transaction.vendor && ` • ${transaction.vendor}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.transaction_type === 'income' ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {transaction.transaction_type === 'income' ? '+' : ''}
                        {formatCurrency(transaction.total_amount)}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {transaction.transaction_type === 'income' ? 'Intäkt' : 'Kostnad'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Inga transaktioner att visa</p>
                <p className="text-sm mt-1">Börja med att ladda upp ditt första kvitto!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Snabbåtgärder</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link to="/chat">
                <Camera className="h-6 w-6" />
                <span>Fotografera kvitto</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link to="/chat">
                <MessageCircle className="h-6 w-6" />
                <span>Fråga AI-assistenten</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link to="/transactions">
                <FileText className="h-6 w-6" />
                <span>Visa transaktioner</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;