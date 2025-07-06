import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign
} from "lucide-react";

interface YearlyStats {
  revenue: number;
  expenses: number;
  netResult: number;
}

interface YearlyStatsCardsProps {
  yearlyStats: YearlyStats;
  formatCurrency: (amount: number) => string;
}

const YearlyStatsCards = ({ yearlyStats, formatCurrency }: YearlyStatsCardsProps) => {
  return (
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
  );
};

export default YearlyStatsCards;