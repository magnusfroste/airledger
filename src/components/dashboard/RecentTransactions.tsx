import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface RecentTransaction {
  id: string;
  description: string;
  total_amount: number;
  transaction_date: string;
  transaction_type: string;
  vendor?: string;
}

interface RecentTransactionsProps {
  recentTransactions: RecentTransaction[];
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

const RecentTransactions = ({ recentTransactions, formatCurrency, formatDate }: RecentTransactionsProps) => {
  const isMobile = useIsMobile();
  
  return (
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
              <div key={transaction.id} className={`${isMobile ? 'p-4' : 'p-4'} bg-gray-50 rounded-lg`}>
                <div className={`flex items-center justify-between ${isMobile ? 'flex-col space-y-3' : ''}`}>
                  <div className={`flex items-center ${isMobile ? 'w-full' : 'space-x-3'}`}>
                    {!isMobile && (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.transaction_type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <Receipt className={`h-5 w-5 ${
                          transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className={`flex items-center gap-2 ${isMobile ? 'justify-between' : ''}`}>
                        <div className="flex items-center gap-2">
                          {isMobile && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              transaction.transaction_type === 'income' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              <Receipt className={`h-4 w-4 ${
                                transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`} />
                            </div>
                          )}
                          <p className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : ''}`}>
                            {transaction.description}
                          </p>
                        </div>
                        {isMobile && (
                          <p className={`text-lg font-semibold ${
                            transaction.transaction_type === 'income' ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {transaction.transaction_type === 'income' ? '+' : ''}
                            {formatCurrency(transaction.total_amount)}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(transaction.transaction_date)}
                        {transaction.vendor && ` • ${transaction.vendor}`}
                      </p>
                      {isMobile && (
                        <Badge variant="outline" className="text-xs mt-2">
                          {transaction.transaction_type === 'income' ? 'Intäkt' : 'Kostnad'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {!isMobile && (
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
                  )}
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
  );
};

export default RecentTransactions;