
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Receipt, FileText, ChevronRight, Calendar, Building, Trash2, Edit, Download, Upload, FileSpreadsheet, Image, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import TransactionEditDialog from "./TransactionEditDialog";
import ReceiptThumbnail from "./ReceiptThumbnail";

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
  reference_number?: string;
  total_amount: number;
  transaction_type: string;
  analysis_data: any;
  image_url?: string;
  image_metadata?: any;
  entries: TransactionEntry[];
}

const TransactionsList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Import/Export state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.analysis_data?.vendor && 
       transaction.analysis_data.vendor.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getTransactionIcon = (transaction: Transaction) => {
    // If transaction has an image, show image icon
    if (transaction.image_metadata || transaction.image_url) {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Image className="h-5 w-5 text-blue-600" />
        </div>
      );
    }

    switch (transaction.transaction_type) {
      case 'income':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Building className="h-5 w-5 text-green-600" />
          </div>
        );
      case 'expense':
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-red-600" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
        );
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
      setTransactions(transactions.filter((t) => t.id !== transactionId));

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

  // CSV Export Function
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast({
        title: "Ingen data att exportera",
        description: "Du har inga transaktioner att exportera.",
        variant: "destructive",
      });
      return;
    }

    // Create flattened CSV with transaction + entry data
    const csvHeader = "transaction_date,description,reference_number,transaction_type,account_code,account_name,debit_amount,credit_amount,entry_description\n";
    const csvRows: string[] = [];

    transactions.forEach((transaction) => {
      transaction.entries.forEach((entry) => {
        csvRows.push([
          transaction.transaction_date,
          `"${transaction.description}"`,
          transaction.reference_number || '',
          transaction.transaction_type,
          entry.account_code,
          `"${entry.account_name}"`,
          entry.debit_amount || 0,
          entry.credit_amount || 0,
          `"${entry.description || ''}"`
        ].join(','));
      });
    });

    const csvContent = csvHeader + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transaktioner_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const totalEntries = transactions.reduce((sum, t) => sum + t.entries.length, 0);
    toast({
      title: "Export lyckades!",
      description: `${transactions.length} transaktioner med ${totalEntries} bokföringsrader exporterade till CSV.`,
    });
  };

  // CSV Import Functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Fel filformat",
        description: "Vänligen välj en CSV-fil.",
        variant: "destructive",
      });
      return;
    }

    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        parseCSVForPreview(text);
      } catch (error) {
        toast({
          title: "Fel vid läsning av fil",
          description: "Kunde inte läsa CSV-filen. Kontrollera formatet.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const parseCSVForPreview = async (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));

    // Validate headers
    const expectedHeaders = ['transaction_date', 'description', 'reference_number', 'transaction_type', 'account_code', 'account_name', 'debit_amount', 'credit_amount', 'entry_description'];
    const requiredHeaders = ['transaction_date', 'description', 'transaction_type', 'account_code', 'account_name'];

    const hasRequiredHeaders = requiredHeaders.every((header) => headers.includes(header));

    if (!hasRequiredHeaders) {
      toast({
        title: "Fel CSV-format",
        description: `CSV-filen måste innehålla minst kolumnerna: ${requiredHeaders.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Get chart of accounts for validation
    const { data: accountsData } = await supabase
      .from('airledger_chart_of_accounts')
      .select('account_code, account_name')
      .eq('is_active', true);

    const validAccountCodes = new Set(accountsData?.map((acc) => acc.account_code) || []);

    const preview: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted fields)
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      const row = {
        transaction_date: values[headers.indexOf('transaction_date')] || '',
        description: values[headers.indexOf('description')] || '',
        reference_number: values[headers.indexOf('reference_number')] || '',
        transaction_type: values[headers.indexOf('transaction_type')] || '',
        account_code: values[headers.indexOf('account_code')] || '',
        account_name: values[headers.indexOf('account_name')] || '',
        debit_amount: parseFloat(values[headers.indexOf('debit_amount')]) || 0,
        credit_amount: parseFloat(values[headers.indexOf('credit_amount')]) || 0,
        entry_description: values[headers.indexOf('entry_description')] || '',
        line: i + 1,
        valid: true,
        errors: [] as string[],
      };

      // Validation
      if (!row.transaction_date || isNaN(Date.parse(row.transaction_date))) {
        row.errors.push('Ogiltigt datum');
        row.valid = false;
      }

      if (!row.description) {
        row.errors.push('Beskrivning saknas');
        row.valid = false;
      }

      if (!['income', 'expense', 'transfer'].includes(row.transaction_type)) {
        row.errors.push('Transaction_type måste vara income, expense eller transfer');
        row.valid = false;
      }

      if (!row.account_code) {
        row.errors.push('Kontokod saknas');
        row.valid = false;
      } else if (!validAccountCodes.has(row.account_code)) {
        row.errors.push('Kontokod finns inte i BAS 2024');
        row.valid = false;
      }

      if (!row.account_name) {
        row.errors.push('Kontonamn saknas');
        row.valid = false;
      }

      if (row.debit_amount === 0 && row.credit_amount === 0) {
        row.errors.push('Antingen debet eller kredit måste ha ett värde');
        row.valid = false;
      }

      if (row.debit_amount > 0 && row.credit_amount > 0) {
        row.errors.push('Endast ett av debet eller kredit kan ha ett värde');
        row.valid = false;
      }

      preview.push(row);
    }

    setImportPreview(preview);
  };

  const handleImportCSV = async () => {
    if (importPreview.length === 0) return;

    const validRows = importPreview.filter((row) => row.valid);
    if (validRows.length === 0) {
      toast({
        title: "Inga giltiga rader",
        description: "Det finns inga giltiga rader att importera.",
        variant: "destructive",
      });
      return;
    }

    setImportLoading(true);

    try {
      // Get current user once
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Du måste vara inloggad för att importera transaktioner');
      }

      // Group rows by transaction (same date, description, type, etc.)
      const transactionGroups = new Map();

      validRows.forEach((row) => {
        const key = `${row.transaction_date}_${row.description}_${row.transaction_type}_${row.reference_number}`;
        if (!transactionGroups.has(key)) {
          transactionGroups.set(key, {
            transaction: {
              transaction_date: row.transaction_date,
              description: row.description,
              reference_number: row.reference_number,
              transaction_type: row.transaction_type,
            },
            entries: [],
          });
        }
        transactionGroups.get(key).entries.push({
          account_code: row.account_code,
          account_name: row.account_name,
          debit_amount: row.debit_amount,
          credit_amount: row.credit_amount,
          description: row.entry_description,
        });
      });

      let successCount = 0;
      let errorCount = 0;

      for (const [key, group] of transactionGroups) {
        try {
          // Calculate total amount correctly
          const totalDebit = group.entries.reduce((sum: number, entry: any) => sum + entry.debit_amount, 0);
          const totalCredit = group.entries.reduce((sum: number, entry: any) => sum + entry.credit_amount, 0);
          const totalAmount = Math.max(totalDebit, totalCredit);

          // Create transaction
          const { data: transactionData, error: transactionError } = await supabase
            .from('airledger_transactions')
            .insert({
              ...group.transaction,
              total_amount: totalAmount,
              user_id: user.id,
            })
            .select()
            .single();

          if (transactionError) {
            console.error(`Transaction error for ${key}:`, transactionError);
            throw transactionError;
          }

          // Create entries
          const entriesWithTransactionId = group.entries.map((entry: any) => ({
            ...entry,
            transaction_id: transactionData.id,
          }));

          const { error: entriesError } = await supabase
            .from('airledger_entries')
            .insert(entriesWithTransactionId);

          if (entriesError) {
            console.error(`Entries error for ${key}:`, entriesError);
            throw entriesError;
          }

          console.log(`Successfully imported transaction: ${key}`);
          successCount++;
        } catch (error) {
          console.error(`Error importing transaction group ${key}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Import slutförd",
        description: `${successCount} transaktioner importerade${errorCount > 0 ? `, ${errorCount} fel` : ''}.`,
      });

      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
      fetchTransactions();
    } catch (error) {
      console.error('Error during import:', error);
      toast({
        title: "Import misslyckades",
        description: "Ett fel uppstod under importen. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
    }
  };

  // Fix the specific transaction with wrong total_amount
  useEffect(() => {
    const fixIncorrectTransaction = async () => {
      try {
        // Find and fix the transaction with ID 3ea4240f-3a68-4c50-83d6-d09aa62335e7
        const { data: transaction, error: fetchError } = await supabase
          .from('airledger_transactions')
          .select('*, airledger_entries(*)')
          .eq('id', '3ea4240f-3a68-4c50-83d6-d09aa62335e7')
          .single();

        if (fetchError || !transaction) {
          console.log('Transaction not found or already fixed');
          return;
        }

        // Check if it has the wrong total_amount
        if (transaction.total_amount === 2837.50) {
          const entries = transaction.airledger_entries;
          const totalDebit = entries.reduce((sum: number, entry: any) => sum + entry.debit_amount, 0);
          const totalCredit = entries.reduce((sum: number, entry: any) => sum + entry.credit_amount, 0);
          const correctTotal = Math.max(totalDebit, totalCredit);

          // Update with correct total
          const { error: updateError } = await supabase
            .from('airledger_transactions')
            .update({ total_amount: correctTotal })
            .eq('id', '3ea4240f-3a68-4c50-83d6-d09aa62335e7');

          if (!updateError) {
            console.log(`Fixed transaction total_amount from ${transaction.total_amount} to ${correctTotal}`);
            fetchTransactions(); // Refresh the list
          }
        }
      } catch (error) {
        console.error('Error fixing incorrect transaction:', error);
      }
    };

    fixIncorrectTransaction();
  }, []);

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
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8">
          <div className={`flex items-center justify-between ${isMobile ? 'flex-col space-y-4' : ''}`}>
            <div className={isMobile ? 'w-full text-center' : ''}>
              <h1 className={`font-semibold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                Transaktioner
              </h1>
              <p className="text-gray-600 mt-1">{filteredTransactions.length} transaktioner</p>
            </div>
            <div className={`flex items-center ${isMobile ? 'flex-row space-x-2 w-full justify-end' : 'space-x-3'}`}>
              {/* Export Button */}
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="p-2"
                disabled={transactions.length === 0}
                title="Exportera transaktioner som CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              {/* Import Dialog */}
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="p-2" title="Importera transaktioner från CSV">
                    <Upload className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-6xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      Importera transaktioner från CSV
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="csvFile">Välj CSV-fil</Label>
                      <Input id="csvFile" type="file" accept=".csv" onChange={handleFileSelect} />
                      <p className="text-xs text-muted-foreground">
                        CSV-filen måste innehålla kolumnerna: transaction_date, description, transaction_type, account_code, account_name, debit_amount, credit_amount. 
                        Rader med samma datum, beskrivning och typ grupperas till samma transaktion.
                      </p>
                    </div>
                    
                    {importPreview.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Förhandsvisning ({importPreview.length} rader)</h4>
                          <Badge variant={importPreview.filter(r => r.valid).length === importPreview.length ? "default" : "secondary"}>
                            {importPreview.filter(r => r.valid).length} av {importPreview.length} giltiga
                          </Badge>
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto border rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-muted sticky top-0">
                              <tr>
                                <th className="text-left p-2">Rad</th>
                                <th className="text-left p-2">Datum</th>
                                <th className="text-left p-2">Beskrivning</th>
                                <th className="text-left p-2">Typ</th>
                                <th className="text-left p-2">Konto</th>
                                <th className="text-left p-2">Debet</th>
                                <th className="text-left p-2">Kredit</th>
                                <th className="text-left p-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importPreview.map((row, index) => (
                                <tr key={index} className={`border-b ${!row.valid ? 'bg-red-50' : ''}`}>
                                  <td className="p-2">{row.line}</td>
                                  <td className="p-2">{row.transaction_date}</td>
                                  <td className="p-2 max-w-32 truncate">{row.description}</td>
                                  <td className="p-2">{row.transaction_type}</td>
                                  <td className="p-2">{row.account_code}</td>
                                  <td className="p-2">{row.debit_amount > 0 ? row.debit_amount : ''}</td>
                                  <td className="p-2">{row.credit_amount > 0 ? row.credit_amount : ''}</td>
                                  <td className="p-2">
                                    {row.valid ? (
                                      <Badge variant="default" className="text-xs">Giltig</Badge>
                                    ) : (
                                      <div>
                                        <Badge variant="destructive" className="text-xs mb-1">Fel</Badge>
                                        <div className="text-xs text-red-600">
                                          {row.errors.slice(0, 2).join(', ')}
                                          {row.errors.length > 2 && '...'}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleImportCSV}
                        disabled={importLoading || importPreview.filter(r => r.valid).length === 0}
                        className="flex-1"
                      >
                        {importLoading ? 'Importerar...' : `Importera ${importPreview.filter(r => r.valid).length} rader`}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setImportDialogOpen(false);
                          setImportFile(null);
                          setImportPreview([]);
                        }}
                      >
                        Avbryt
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Info Button */}
              <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2" title="Information om transaktioner">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Transaktioner - Hjälp
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Download className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Exportera CSV</h4>
                          <p className="text-sm text-muted-foreground">
                            Exportera alla dina transaktioner och bokföringsposter till en CSV-fil. 
                            Filen innehåller datum, beskrivning, kontokoder, debet/kredit-belopp och mer.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Upload className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Importera CSV</h4>
                          <p className="text-sm text-muted-foreground">
                            Importera transaktioner från en CSV-fil. Filen måste innehålla kolumnerna: 
                            transaction_date, description, transaction_type, account_code, account_name, 
                            debit_amount, credit_amount. Systemet validerar alla rader innan import.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Ladda ner mall</h4>
                          <p className="text-sm text-muted-foreground">
                            För att skapa en egen CSV-fil, exportera först några befintliga transaktioner 
                            för att få rätt format. Du kan också använda chatt-funktionen för att lägga 
                            till transaktioner enkelt.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Receipt className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Lägga till transaktioner</h4>
                          <p className="text-sm text-muted-foreground">
                            Du kan lägga till transaktioner på flera sätt:
                          </p>
                          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            <li>• Använd chatt-funktionen och berätta vad du gjort</li>
                            <li>• Fotografera eller ladda upp kvitton för automatisk analys</li>
                            <li>• Importera från CSV-fil med flera transaktioner</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto md:px-6 md:py-6 px-0 py-[10px]">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Sök transaktioner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="max-w-6xl mx-auto md:px-6 pb-8 px-0">
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div
                  className={`cursor-pointer ${isMobile ? 'p-4' : 'p-6'}`}
                  onClick={() => setExpandedTransaction(expandedTransaction === transaction.id ? null : transaction.id)}
                >
                  <div className={`flex items-center justify-between ${isMobile ? 'flex-col space-y-3' : ''}`}>
                    <div className={`flex items-center ${isMobile ? 'w-full' : 'space-x-4'}`}>
                      {!isMobile && getTransactionIcon(transaction)}
                      <div className="flex-1">
                        <div className={`flex items-center gap-2 ${isMobile ? 'justify-between' : ''}`}>
                          <div className="flex items-center gap-2">
                            {isMobile && getTransactionIcon(transaction)}
                            <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : ''}`}>
                              {transaction.description}
                            </h3>
                          </div>
                          {(transaction.image_metadata || transaction.image_url) && (
                            <ReceiptThumbnail
                              imagePath={transaction.image_metadata?.storagePath || transaction.image_url}
                              thumbnailPath={transaction.image_metadata?.thumbnailPath}
                              metadata={transaction.image_metadata}
                              analysis={transaction.analysis_data}
                              compact={true}
                              showActions={false}
                            />
                          )}
                        </div>
                        <div className={`flex items-center mt-1 ${isMobile ? 'justify-between' : 'space-x-4'}`}>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">{formatDate(transaction.transaction_date)}</span>
                            {transaction.analysis_data?.vendor && !isMobile && (
                              <span className="text-sm text-gray-500">• {transaction.analysis_data.vendor}</span>
                            )}
                          </div>
                          {isMobile && (
                            <span className={`text-lg font-semibold ${
                              transaction.transaction_type === 'income' ? 'text-green-600' : 'text-gray-900'
                            }`}>
                              {transaction.transaction_type === 'income' ? '+' : ''}
                              {formatAmount(transaction.total_amount)}
                            </span>
                          )}
                        </div>
                        {isMobile && transaction.analysis_data?.vendor && (
                          <div className="mt-1">
                            <span className="text-sm text-gray-500">{transaction.analysis_data.vendor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className={`flex items-center ${isMobile ? 'w-full justify-between' : 'space-x-4'}`}>
                      {!isMobile && (
                        <span className={`text-lg font-semibold ${
                          transaction.transaction_type === 'income' ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {transaction.transaction_type === 'income' ? '+' : ''}
                          {formatAmount(transaction.total_amount)}
                        </span>
                      )}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size={isMobile ? "sm" : "sm"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTransaction(transaction);
                          }}
                          className={`text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${isMobile ? 'p-2' : ''}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size={isMobile ? "sm" : "sm"}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTransaction(transaction.id);
                          }}
                          className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${isMobile ? 'p-2' : ''}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight
                          className={`h-5 w-5 text-gray-400 transition-transform ${
                            expandedTransaction === transaction.id ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content - Accounting Entries */}
                {expandedTransaction === transaction.id && transaction.entries.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <div className={isMobile ? 'p-4' : 'p-6'}>
                      {/* Image thumbnail if available */}
                      {(transaction.image_metadata || transaction.image_url) && (
                        <div className={isMobile ? 'mb-4' : 'mb-6'}>
                          <h4 className={`font-medium text-gray-900 mb-3 ${isMobile ? 'text-sm' : ''}`}>
                            Bifogad bild
                          </h4>
                          <div className="w-fit">
                            <ReceiptThumbnail
                              imagePath={transaction.image_metadata?.storagePath || transaction.image_url}
                              thumbnailPath={transaction.image_metadata?.thumbnailPath}
                              metadata={transaction.image_metadata}
                              analysis={transaction.analysis_data}
                              compact={isMobile}
                              showActions={!isMobile}
                            />
                          </div>
                        </div>
                      )}
                      
                      <h4 className={`font-medium text-gray-900 mb-4 ${isMobile ? 'text-sm' : ''}`}>
                        Kontering
                      </h4>
                      <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
                        {transaction.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`bg-white rounded-lg border border-gray-200 ${isMobile ? 'p-3' : 'py-3 px-4'}`}
                          >
                            <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center justify-between'}`}>
                              <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-4'}`}>
                                <div className={`bg-blue-100 rounded-md flex items-center justify-center ${
                                  isMobile ? 'w-10 h-6' : 'w-12 h-8'
                                }`}>
                                  <span className={`font-medium text-blue-800 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                    {entry.account_code}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <p className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : ''}`}>
                                    {entry.account_name}
                                  </p>
                                  {entry.description && (
                                    <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                      {entry.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className={`${isMobile ? 'flex justify-between text-sm' : 'text-right'}`}>
                                {entry.debit_amount > 0 && (
                                  <div className={isMobile ? 'text-sm' : 'text-sm'}>
                                    <span className="text-gray-500">Debet:</span>
                                    <span className="font-medium text-gray-900 ml-2">
                                      {formatAmount(entry.debit_amount)}
                                    </span>
                                  </div>
                                )}
                                {entry.credit_amount > 0 && (
                                  <div className={isMobile ? 'text-sm' : 'text-sm'}>
                                    <span className="text-gray-500">Kredit:</span>
                                    <span className="font-medium text-gray-900 ml-2">
                                      {formatAmount(entry.credit_amount)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Balance Check */}
                      <div className={`mt-4 p-4 bg-blue-50 rounded-lg ${isMobile ? 'text-sm' : ''}`}>
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
                              ? "text-green-600" 
                              : "text-red-600"
                          }>
                            {Math.abs(transaction.entries.reduce((sum, entry) => sum + entry.debit_amount - entry.credit_amount, 0)) < 0.01 
                              ? "✓ Balanserad" 
                              : "⚠ Obalanserad"}
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
              <p className="text-gray-500 mt-1">
                Prova att ändra dina sökfilter eller ladda upp ditt första kvitto.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <TransactionEditDialog
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction!}
        onTransactionUpdated={fetchTransactions}
      />
    </div>
  );
};

export default TransactionsList;
