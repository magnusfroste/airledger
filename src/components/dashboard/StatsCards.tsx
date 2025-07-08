import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  AlertCircle,
  DollarSign
} from "lucide-react";

interface DashboardStats {
  revenue: number;
  expenses: number;
  checkingBalance: number;
  unpaidInvoices: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
  formatCurrency: (amount: number) => string;
}

const StatsCards = ({ stats, formatCurrency }: StatsCardsProps) => {
  return (
    <>
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
                <p className="text-sm font-medium text-gray-600">Obetalda fakturor (kunder)</p>
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
    </>
  );
};

export default StatsCards;