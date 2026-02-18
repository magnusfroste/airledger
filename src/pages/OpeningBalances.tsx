import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Calculator, TrendingUp, TrendingDown, Download, Upload, FileSpreadsheet, Info, ClipboardPaste } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AccountSelector } from "@/components/AccountSelector";

interface OpeningBalance {
  id: string;
  account_code: string;
  account_name: string;
  opening_balance: number;
  balance_type: 'debit' | 'credit';
  created_at: string;
  updated_at: string;
}

const OpeningBalances = () => {
  const [balances, setBalances] = useState<OpeningBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<OpeningBalance | null>(null);
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    opening_balance: 0,
  });
  
  // Import/Export state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [pasteText, setPasteText] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBalances = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('airledger_opening')
        .select('*')
        .eq('user_id', user.id)
        .order('account_code', { ascending: true });

      if (error) {
        throw error;
      }

      setBalances((data || []) as OpeningBalance[]);
    } catch (error) {
      console.error('Error fetching opening balances:', error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta ingående balanser. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [user]);

  const handleSave = async () => {
    if (!user || !formData.account_code || !formData.account_name) {
      toast({
        title: "Obligatoriska fält",
        description: "Välj ett konto från listan.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get account info from chart of accounts to determine balance type
      const { data: accountData, error: accountError } = await supabase
        .from('airledger_chart_of_accounts')
        .select('normal_balance')
        .eq('account_code', formData.account_code)
        .single();

      if (accountError) {
        console.error('Error fetching account info:', accountError);
      }

      // Determine balance type - use chart of accounts data if available, otherwise fall back to old logic
      let balanceType: 'debit' | 'credit' = 'debit';
      
      if (accountData?.normal_balance) {
        balanceType = formData.opening_balance >= 0 ? accountData.normal_balance as 'debit' | 'credit' : 
                     (accountData.normal_balance === 'debit' ? 'credit' : 'debit');
      } else {
        // Fallback logic for compatibility
        const accountCodeNum = parseInt(formData.account_code);
        if (accountCodeNum >= 1000 && accountCodeNum <= 1999) {
          balanceType = formData.opening_balance >= 0 ? 'debit' : 'credit';
        } else if (accountCodeNum >= 2000 && accountCodeNum <= 2999) {
          balanceType = formData.opening_balance >= 0 ? 'credit' : 'debit';
        } else if (accountCodeNum >= 3000 && accountCodeNum <= 3999) {
          balanceType = formData.opening_balance >= 0 ? 'credit' : 'debit';
        } else if (accountCodeNum >= 4000 && accountCodeNum <= 4999 || accountCodeNum >= 6000 && accountCodeNum <= 6999) {
          balanceType = formData.opening_balance >= 0 ? 'debit' : 'credit';
        }
      }

      const balanceData = {
        user_id: user.id,
        account_code: formData.account_code,
        account_name: formData.account_name,
        opening_balance: Math.abs(formData.opening_balance),
        balance_type: balanceType,
      };

      let error;
      if (editingBalance) {
        // Update existing balance
        const { error: updateError } = await supabase
          .from('airledger_opening')
          .update({
            ...balanceData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBalance.id);
        error = updateError;
      } else {
        // Create new balance
        const { error: insertError } = await supabase
          .from('airledger_opening')
          .upsert(balanceData, {
            onConflict: 'user_id,account_code'
          });
        error = insertError;
      }

      if (error) {
        throw error;
      }

      toast({
        title: "Sparat!",
        description: `Ingående balans för ${formData.account_code} ${formData.account_name} har sparats.`,
      });

      setDialogOpen(false);
      setEditingBalance(null);
      setFormData({ account_code: '', account_name: '', opening_balance: 0 });
      fetchBalances();

    } catch (error) {
      console.error('Error saving opening balance:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara ingående balans. Försök igen.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (balance: OpeningBalance) => {
    setEditingBalance(balance);
    setFormData({
      account_code: balance.account_code,
      account_name: balance.account_name,
      opening_balance: balance.balance_type === 'credit' && balance.opening_balance > 0 
        ? -balance.opening_balance 
        : balance.opening_balance,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (balance: OpeningBalance) => {
    if (!confirm(`Är du säker på att du vill ta bort ${balance.account_code} ${balance.account_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('airledger_opening')
        .delete()
        .eq('id', balance.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Borttaget!",
        description: `${balance.account_code} ${balance.account_name} har tagits bort.`,
      });

      fetchBalances();

    } catch (error) {
      console.error('Error deleting opening balance:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ta bort ingående balans. Försök igen.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ account_code: '', account_name: '', opening_balance: 0 });
    setEditingBalance(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTotalsByType = () => {
    const debitTotal = balances
      .filter(b => b.balance_type === 'debit')
      .reduce((sum, b) => sum + b.opening_balance, 0);
    
    const creditTotal = balances
      .filter(b => b.balance_type === 'credit')
      .reduce((sum, b) => sum + b.opening_balance, 0);

    return { debitTotal, creditTotal };
  };

  const { debitTotal, creditTotal } = getTotalsByType();

  // CSV Export Function
  const handleExportCSV = () => {
    if (balances.length === 0) {
      toast({
        title: "Ingen data att exportera",
        description: "Du har inga ingående balanser att exportera.",
        variant: "destructive",
      });
      return;
    }

    const csvHeader = "account_code,account_name,opening_balance,balance_type\n";
    const csvData = balances.map(balance => 
      `${balance.account_code},"${balance.account_name}",${balance.opening_balance},${balance.balance_type}`
    ).join('\n');
    
    const csvContent = csvHeader + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ingående_balanser_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export lyckades!",
      description: `${balances.length} ingående balanser exporterade till CSV.`,
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
    
    // Auto-detect delimiter: tab or comma
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    const headers = firstLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));
    
    // Validate headers
    const expectedHeaders = ['account_code', 'account_name', 'opening_balance', 'balance_type'];
    const hasValidHeaders = expectedHeaders.every(header => headers.includes(header));
    
    if (!hasValidHeaders) {
      toast({
        title: "Fel format",
        description: "Datan måste innehålla kolumnerna: account_code, account_name, opening_balance, balance_type",
        variant: "destructive",
      });
      return;
    }

    // Get chart of accounts for validation
    const { data: accountsData } = await supabase
      .from('airledger_chart_of_accounts')
      .select('account_code, account_name')
      .eq('is_active', true);

    const accountMap = new Map(accountsData?.map(acc => [acc.account_code, acc.account_name]) || []);
    
    const preview = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse line based on detected delimiter
      let values: string[];
      if (delimiter === '\t') {
        values = line.split('\t').map(v => v.trim().replace(/"/g, ''));
      } else {
        values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      }
      const row = {
        account_code: values[headers.indexOf('account_code')],
        account_name: values[headers.indexOf('account_name')],
        opening_balance: parseFloat(values[headers.indexOf('opening_balance')]) || 0,
        balance_type: values[headers.indexOf('balance_type')],
        line: i + 1,
        valid: true,
        errors: [] as string[]
      };
      
      // Validation
      if (!row.account_code) {
        row.errors.push('Kontokod saknas');
        row.valid = false;
      } else if (!accountMap.has(row.account_code)) {
        row.errors.push('Kontokod finns inte i BAS 2024');
        row.valid = false;
      } else {
        // Use the official BAS account name from chart of accounts
        row.account_name = accountMap.get(row.account_code)!;
      }
      
      if (!row.account_name) {
        row.errors.push('Kontonamn saknas');
        row.valid = false;
      }
      
      if (isNaN(row.opening_balance)) {
        row.errors.push('Ogiltigt belopp');
        row.valid = false;
      }
      
      if (!['debit', 'credit'].includes(row.balance_type)) {
        row.errors.push('Balance_type måste vara debit eller credit');
        row.valid = false;
      }
      
      preview.push(row);
    }
    
    setImportPreview(preview);
  };

  const handleImportCSV = async () => {
    if (!user || importPreview.length === 0) return;
    
    const validRows = importPreview.filter(row => row.valid);
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
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of validRows) {
        try {
          const { error } = await supabase
            .from('airledger_opening')
            .upsert({
              user_id: user.id,
              account_code: row.account_code,
              account_name: row.account_name,
              opening_balance: Math.abs(row.opening_balance),
              balance_type: row.balance_type,
            }, {
              onConflict: 'user_id,account_code'
            });
          
          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Error importing row ${row.line}:`, error);
          errorCount++;
        }
      }
      
      toast({
        title: "Import slutförd",
        description: `${successCount} balanser importerade${errorCount > 0 ? `, ${errorCount} fel` : ''}.`,
      });
      
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
      fetchBalances();
      
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

  if (loading) {
    return (
      <div className="container px-3 py-3 sm:px-6 sm:py-6 max-w-6xl mx-auto">
        <div className="animate-fade-in space-y-6">
          <div className="h-6 sm:h-8 bg-muted rounded animate-pulse" />
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
    <TooltipProvider>
      <div className="container px-3 py-3 sm:px-6 sm:py-6 max-w-6xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Ingående balanser</h1>
            <p className="text-muted-foreground mt-1">
              Registrera och hantera dina startbalanser enligt BAS 2024
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Export Button - Icon only */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleExportCSV} 
                  variant="outline" 
                  size="icon"
                  disabled={balances.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportera till CSV</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Import Dialog - Icon only */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Importera från CSV</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Importera ingående balanser
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Tabs defaultValue="file" onValueChange={() => setImportPreview([])}>
                    <TabsList className="w-full">
                      <TabsTrigger value="file" className="flex-1 gap-1.5">
                        <Upload className="h-3.5 w-3.5" />
                        Ladda upp fil
                      </TabsTrigger>
                      <TabsTrigger value="paste" className="flex-1 gap-1.5">
                        <ClipboardPaste className="h-3.5 w-3.5" />
                        Klistra in data
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="file">
                      <div className="space-y-2">
                        <Label htmlFor="csvFile">Välj CSV-fil</Label>
                        <Input
                          id="csvFile"
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                        />
                        <p className="text-xs text-muted-foreground">
                          CSV-filen måste innehålla kolumnerna: account_code, account_name, opening_balance, balance_type
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="paste">
                      <div className="space-y-2">
                        <Label htmlFor="csvPaste">Klistra in CSV-data</Label>
                        <Textarea
                          id="csvPaste"
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                          placeholder={`account_code,account_name,opening_balance,balance_type\n1510,Kundfordringar,25000,debit\n1930,Företagskonto,150000,debit\n2440,Leverantörsskulder,30000,credit`}
                          className="min-h-[140px] font-mono text-xs"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Stöder CSV och tab-separerad data (kopiera direkt från Excel/Google Sheets)
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              if (pasteText.trim()) {
                                parseCSVForPreview(pasteText);
                              }
                            }}
                            disabled={!pasteText.trim()}
                          >
                            Förhandsgranska
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                
                {importPreview.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Förhandsvisning ({importPreview.length} rader)</h4>
                      <Badge variant={importPreview.filter(r => r.valid).length === importPreview.length ? "default" : "secondary"}>
                        {importPreview.filter(r => r.valid).length} av {importPreview.length} giltiga
                      </Badge>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2">Rad</th>
                            <th className="text-left p-2">Kontokod</th>
                            <th className="text-left p-2">Kontonamn</th>
                            <th className="text-left p-2">Belopp</th>
                            <th className="text-left p-2">Typ</th>
                            <th className="text-left p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((row, index) => (
                            <tr key={index} className={`border-b ${!row.valid ? 'bg-red-50' : ''}`}>
                              <td className="p-2">{row.line}</td>
                              <td className="p-2">{row.account_code}</td>
                              <td className="p-2">{row.account_name}</td>
                              <td className="p-2">{row.opening_balance}</td>
                              <td className="p-2">{row.balance_type}</td>
                              <td className="p-2">
                                {row.valid ? (
                                  <Badge variant="default" className="text-xs">Giltig</Badge>
                                ) : (
                                  <div>
                                    <Badge variant="destructive" className="text-xs mb-1">Fel</Badge>
                                    <div className="text-xs text-red-600">
                                      {row.errors.join(', ')}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Balance check */}
                    {(() => {
                      const validRows = importPreview.filter(r => r.valid);
                      const debit = validRows.filter(r => r.balance_type === 'debit').reduce((s, r) => s + r.opening_balance, 0);
                      const credit = validRows.filter(r => r.balance_type === 'credit').reduce((s, r) => s + r.opening_balance, 0);
                      const balanced = Math.abs(debit - credit) < 0.01;
                      return (
                        <div className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${balanced ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>
                          <span>Debet: {formatCurrency(debit)} · Kredit: {formatCurrency(credit)}</span>
                          {!balanced && <span className="font-medium">Differens: {formatCurrency(Math.abs(debit - credit))}</span>}
                          {balanced && <span className="font-medium">✓ Balanserar</span>}
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleImportCSV}
                    disabled={importLoading || importPreview.filter(r => r.valid).length === 0}
                    className="flex-1"
                  >
                    {importLoading ? 'Importerar...' : `Importera ${importPreview.filter(r => r.valid).length} balanser`}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setImportDialogOpen(false);
                    setImportFile(null);
                    setImportPreview([]);
                    setPasteText('');
                  }}>
                    Avbryt
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* CSV Info Dialog */}
          <Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>CSV-hjälp och instruktioner</p>
              </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  CSV Export & Import Guide
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">📤 Export till CSV</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Klicka på nedladdningsikonen för att exportera alla dina ingående balanser till en CSV-fil.
                  </p>
                  <div className="bg-muted p-3 rounded-lg text-xs">
                    <p className="mb-1">Exporterad fil innehåller:</p>
                    <p>• <strong>account_code</strong> - Kontokod (ex: 1910)</p>
                    <p>• <strong>account_name</strong> - Kontonamn (ex: "Kassa")</p>
                    <p>• <strong>opening_balance</strong> - Belopp (ex: 50000)</p>
                    <p>• <strong>balance_type</strong> - debit eller credit</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">📥 Import från CSV</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground mb-1">Steg 1: Skapa CSV-mall</p>
                      <p>Exportera först dina befintliga balanser som mall, eller skapa en ny CSV-fil med kolumnrubrikerna.</p>
                    </div>
                    
                    <div>
                      <p className="font-medium text-foreground mb-1">Steg 2: Fyll i data</p>
                      <p>Öppna CSV-filen i Excel eller liknande och lägg till dina balanser:</p>
                      <div className="bg-muted p-3 rounded-lg text-xs mt-2 font-mono">
                        <p>account_code,account_name,opening_balance,balance_type</p>
                        <p>1910,"Kassa",50000,debit</p>
                        <p>2440,"Leverantörsskulder",25000,credit</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-medium text-foreground mb-1">Steg 3: Ladda upp</p>
                      <p>Klicka på uppladdningsikonen och välj din CSV-fil. Systemet validerar automatiskt mot BAS 2024.</p>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mt-3">
                    <p className="text-xs text-orange-700">
                      <strong>Tips:</strong> balance_type sätts automatiskt utifrån kontotyp, men du kan ange "debit" eller "credit" manuellt om behov finns.
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Add New Balance Dialog */}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Ny ingående balans
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingBalance ? 'Redigera' : 'Lägg till'} ingående balans
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Välj konto</Label>
                  <AccountSelector
                    value={formData.account_code}
                    onValueChange={(accountCode, accountName) => 
                      setFormData({ ...formData, account_code: accountCode, account_name: accountName })
                    }
                    placeholder="Sök och välj konto från BAS 2024..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening_balance">Belopp (kr)</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: Number(e.target.value) })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Systemet bestämmer automatiskt debet/kredit baserat på kontotyp enligt BAS 2024
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    {editingBalance ? 'Uppdatera' : 'Spara'}
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Avbryt
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt debet</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(debitTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tillgångar och kostnader
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt kredit</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(creditTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Skulder och intäkter
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balans</CardTitle>
            <Calculator className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              Math.abs(debitTotal - creditTotal) < 0.01 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {formatCurrency(Math.abs(debitTotal - creditTotal))}
            </div>
            <Badge 
              variant={Math.abs(debitTotal - creditTotal) < 0.01 ? "default" : "secondary"}
              className="mt-2"
            >
              {Math.abs(debitTotal - creditTotal) < 0.01 ? 'Balanserad' : 'Obalanserad'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Opening Balances List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Ingående balanser ({balances.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balances.length > 0 ? (
            <div className="space-y-2">
              {balances.map((balance) => (
                <div
                  key={balance.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-border/20 rounded-lg hover:bg-muted/30 transition-colors gap-2 sm:gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{balance.account_code}</span>
                      <span className="font-medium text-sm sm:text-base truncate">{balance.account_name}</span>
                      <Badge 
                        variant={balance.balance_type === 'debit' ? 'default' : 'secondary'}
                        className="text-xs shrink-0"
                      >
                        {balance.balance_type === 'debit' ? 'Debet' : 'Kredit'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className={`font-semibold text-base sm:text-lg ${
                      balance.balance_type === 'debit' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(balance.opening_balance)}
                    </div>
                    
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(balance)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(balance)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Inga ingående balanser</h3>
              <p className="text-muted-foreground mb-6">
                Lägg till dina startbalanser för att komma igång med bokföringen.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Lägg till första balansen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
};

export default OpeningBalances;