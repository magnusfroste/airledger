import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Receipt, FileText, ChevronRight, Calendar, Building, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TransactionEditDialog from "./TransactionEditDialog";

interface TransactionEntry {
  id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  total_amount: number;
  transaction_type: string;
  status: string;
  analysis_data: any;
  entries: TransactionEntry[];
}

const TransactionsList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions with their entries
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('airledger_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch entries for each transaction
      const transactionsWithEntries = await Promise.all(
        (transactionsData || []).map(async (transaction) => {
          const { data: entries, error: entriesError } = await supabase
            .from('airledger_entries')
            .select('*')
            .eq('transaction_id', transaction.id)
            .order('account_code');

          if (entriesError) {
            console.error('Error fetching entries:', entriesError);
            return { ...transaction, entries: [] };
          }

          return { ...transaction, entries: entries || [] };
        })
      );

      setTransactions(transactionsWithEntries);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Fel vid hämtning",
        description: "Kunde inte hämta transaktioner. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.analysis_data?.vendor && transaction.analysis_data.vendor.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Publicerad</Badge>;
      case 'reconciled':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Avstämd</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Utkast</Badge>;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <Building className="h-5 w-5 text-green-600" />
        </div>;
      case 'expense':
        return <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <Receipt className="h-5 w-5 text-red-600" />
        </div>;
      default:
        return <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      // First delete all entries for this transaction
      const { error: entriesError } = await supabase
        .from('airledger_entries')
        .delete()
        .eq('transaction_id', transactionId);

      if (entriesError) throw entriesError;

      // Then delete the transaction itself
      const { error: transactionError } = await supabase
        .from('airledger_transactions')
        .delete()
        .eq('id', transactionId);

      if (transactionError) throw transactionError;

      // Update local state
      setTransactions(transactions.filter(t => t.id !== transactionId));
      
      toast({
        title: "Transaktion borttagen",
        description: "Transaktionen har tagits bort permanent.",
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Fel vid borttagning",
        description: "Kunde inte ta bort transaktionen. Försök igen.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Laddar transaktioner...</p>
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
              <h1 className="text-3xl font-semibold text-gray-900">Transaktioner</h1>
              <p className="text-gray-600 mt-1">{filteredTransactions.length} transaktioner</p>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Senast uppdaterad just nu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Sök transaktioner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 border-gray-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                <SelectItem value="draft">Utkast</SelectItem>
                <SelectItem value="posted">Publicerad</SelectItem>
                <SelectItem value="reconciled">Avstämd</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedTransaction(
                    expandedTransaction === transaction.id ? null : transaction.id
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getTransactionIcon(transaction.transaction_type)}
                      <div>
                        <h3 className="font-medium text-gray-900">{transaction.description}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500">{formatDate(transaction.transaction_date)}</span>
                          {transaction.analysis_data?.vendor && (
                            <span className="text-sm text-gray-500">• {transaction.analysis_data.vendor}</span>
                          )}
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`text-lg font-semibold ${
                        transaction.transaction_type === 'income' ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {transaction.transaction_type === 'income' ? '+' : ''}
                        {formatAmount(transaction.total_amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTransaction(transaction);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTransaction(transaction.id);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${
                        expandedTransaction === transaction.id ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </div>
                </div>

                {/* Expanded Content - Accounting Entries */}
                {expandedTransaction === transaction.id && transaction.entries.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <div className="p-6">
                      <h4 className="font-medium text-gray-900 mb-4">Kontering</h4>
                      <div className="space-y-3">
                        {transaction.entries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-800">{entry.account_code}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{entry.account_name}</p>
                                <p className="text-sm text-gray-500">{entry.description}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              {entry.debit_amount > 0 && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Debet:</span>
                                  <span className="font-medium text-gray-900 ml-2">{formatAmount(entry.debit_amount)}</span>
                                </div>
                              )}
                              {entry.credit_amount > 0 && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Kredit:</span>
                                  <span className="font-medium text-gray-900 ml-2">{formatAmount(entry.credit_amount)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Balance Check */}
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Debet:</span>
                          <span className="font-medium">
                            {formatAmount(transaction.entries.reduce((sum, entry) => sum + entry.debit_amount, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-600">Total Kredit:</span>
                          <span className="font-medium">
                            {formatAmount(transaction.entries.reduce((sum, entry) => sum + entry.credit_amount, 0))}
                          </span>
                        </div>
                        <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between text-sm font-medium">
                          <span>Balans:</span>
                          <span className={
                            Math.abs(transaction.entries.reduce((sum, entry) => sum + entry.debit_amount - entry.credit_amount, 0)) < 0.01
                              ? "text-green-600" : "text-red-600"
                          }>
                            {Math.abs(transaction.entries.reduce((sum, entry) => sum + entry.debit_amount - entry.credit_amount, 0)) < 0.01
                              ? "✓ Balanserad" : "⚠ Obalanserad"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Inga transaktioner hittades</h3>
              <p className="text-gray-500 mt-1">Prova att ändra dina sökfilter eller ladda upp ditt första kvitto.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <TransactionEditDialog
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onTransactionUpdated={fetchTransactions}
      />
    </div>
  );
};

export default TransactionsList;