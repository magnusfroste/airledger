import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Receipt
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

      // Revenue - posted income transactions this month
      const revenue = transactions
        .filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return t.transaction_type === 'income' && 
                 t.status === 'posted' &&
                 transactionDate.getMonth() === currentMonth &&
                 transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.total_amount, 0);

      // Expenses - posted expense transactions this month
      const expenses = transactions
        .filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return t.transaction_type === 'expense' && 
                 t.status === 'posted' &&
                 transactionDate.getMonth() === currentMonth &&
                 transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.total_amount, 0);

      // Checking account balance (1930) - credit minus debit
      const checkingBalance = entries
        .filter(e => e.account_code === '1930')
        .reduce((sum, e) => sum + (e.credit_amount || 0) - (e.debit_amount || 0), 0);

      // Unpaid invoices - draft income transactions or accounts payable (2640)
      const unpaidInvoicesAmount = transactions
        .filter(t => t.transaction_type === 'income' && t.status === 'draft')
        .reduce((sum, t) => sum + t.total_amount, 0);

      const unpaidPayables = entries
        .filter(e => e.account_code === '2640')
        .reduce((sum, e) => sum + (e.credit_amount || 0) - (e.debit_amount || 0), 0);

      setStats({
        revenue,
        expenses: Math.abs(expenses),
        checkingBalance,
        unpaidInvoices: unpaidInvoicesAmount + unpaidPayables
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

      {/* Stats Cards */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* Net Result Card */}
        <div className="mb-8">
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
        </div>

        {/* Recent Transactions */}
        <Card className="bg-white border border-gray-200">
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