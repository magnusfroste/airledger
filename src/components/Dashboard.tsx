import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "./dashboard/DashboardHeader";
import StatsCards from "./dashboard/StatsCards";
import YearlyStatsCards from "./dashboard/YearlyStatsCards";
import ChartsSection from "./dashboard/ChartsSection";
import RecentTransactions from "./dashboard/RecentTransactions";
import QuotaWarning from "./QuotaWarning";
import { useSubscription } from "@/hooks/useSubscription";
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
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    subscription,
    usage
  } = useSubscription();
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
      const [transactionsResult, entriesResult] = await Promise.all([supabase.from('airledger_transactions').select('*').order('transaction_date', {
        ascending: false
      }), supabase.from('airledger_entries').select('*')]);
      if (transactionsResult.error) throw transactionsResult.error;
      if (entriesResult.error) throw entriesResult.error;
      const transactions = transactionsResult.data || [];
      const entries = entriesResult.data || [];

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // MONTHLY DATA
      // Revenue - only from sales (3000 account), not payments
      const monthlyRevenue = entries.filter(e => {
        const entryDate = new Date(e.created_at);
        return e.account_code === '3000' && entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      }).reduce((sum, e) => sum + (e.credit_amount || 0), 0);

      // Expenses - posted expense transactions this month
      const monthlyExpenses = transactions.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return t.transaction_type === 'expense' && transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
      }).reduce((sum, t) => sum + t.total_amount, 0);

      // Checking account balance (1930) - include opening balance + transactions
      const checkingOpeningBalance = await supabase.from('airledger_opening').select('opening_balance').eq('account_code', '1930').single();
      const checkingTransactions = entries.filter(e => e.account_code === '1930').reduce((sum, e) => sum + (e.debit_amount || 0) - (e.credit_amount || 0), 0);
      const checkingBalance = (checkingOpeningBalance.data?.opening_balance || 0) + checkingTransactions;

      // Unpaid invoices - customer receivables (1510) minus any advance payments
      const customerReceivables = entries.filter(e => e.account_code === '1510').reduce((sum, e) => sum + (e.debit_amount || 0) - (e.credit_amount || 0), 0);
      setStats({
        revenue: monthlyRevenue,
        expenses: Math.abs(monthlyExpenses),
        checkingBalance,
        unpaidInvoices: Math.max(customerReceivables, 0)
      });

      // YEARLY DATA
      // Calculate yearly totals and monthly breakdown
      const yearlyRevenue = entries.filter(e => {
        const entryDate = new Date(e.created_at);
        return e.account_code === '3000' && entryDate.getFullYear() === currentYear;
      }).reduce((sum, e) => sum + (e.credit_amount || 0), 0);
      const yearlyExpenses = transactions.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return t.transaction_type === 'expense' && transactionDate.getFullYear() === currentYear;
      }).reduce((sum, t) => sum + t.total_amount, 0);

      // Create monthly breakdown for charts
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
      const monthlyBreakdown = monthNames.map((month, index) => {
        const monthRevenue = entries.filter(e => {
          const entryDate = new Date(e.created_at);
          return e.account_code === '3000' && entryDate.getMonth() === index && entryDate.getFullYear() === currentYear;
        }).reduce((sum, e) => sum + (e.credit_amount || 0), 0);
        const monthExpenses = transactions.filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return t.transaction_type === 'expense' && transactionDate.getMonth() === index && transactionDate.getFullYear() === currentYear;
        }).reduce((sum, t) => sum + t.total_amount, 0);
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
      const recent = transactions.slice(0, 5).map(t => ({
        id: t.id,
        description: t.description,
        total_amount: t.total_amount,
        transaction_date: t.transaction_date,
        transaction_type: t.transaction_type,
        vendor: typeof t.analysis_data === 'object' && t.analysis_data !== null && 'vendor' in t.analysis_data ? String(t.analysis_data.vendor) : undefined
      }));
      setRecentTransactions(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Fel vid laddning",
        description: "Kunde inte hämta dashboard-data. Försök igen.",
        variant: "destructive"
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
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Laddar dashboard...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50">
      <DashboardHeader greeting={greeting} userName={userName} />

      {/* Main Content with Tabs */}
      <div className="max-w-6xl mx-auto pb-20 sm:pb-6 px-[10px] py-[10px]">
        {/* Quota Warning */}
        {subscription && <div className="mb-6">
            <QuotaWarning subscriptionTier={subscription.subscription_tier} usage={usage || undefined} />
          </div>}
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
            <StatsCards stats={stats} formatCurrency={formatCurrency} />
          </TabsContent>

          {/* Yearly View */}
          <TabsContent value="year" className="space-y-8">
            <YearlyStatsCards yearlyStats={yearlyStats} formatCurrency={formatCurrency} />
            <ChartsSection monthlyBreakdown={yearlyStats.monthlyBreakdown} formatCurrency={formatCurrency} />
          </TabsContent>
        </Tabs>

        <RecentTransactions recentTransactions={recentTransactions} formatCurrency={formatCurrency} formatDate={formatDate} />
      </div>
    </div>;
};
export default Dashboard;