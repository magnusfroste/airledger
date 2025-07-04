import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Calculator, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
        description: "Fyll i kontonummer och kontonamn.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Determine balance type based on account code (BAS 2024)
      const accountCodeNum = parseInt(formData.account_code);
      let balanceType: 'debit' | 'credit' = 'debit';
      
      if (accountCodeNum >= 1000 && accountCodeNum <= 1999) {
        // Tillgångar (Assets) - normal balance is debit
        balanceType = formData.opening_balance >= 0 ? 'debit' : 'credit';
      } else if (accountCodeNum >= 2000 && accountCodeNum <= 2999) {
        // Skulder (Liabilities) - normal balance is credit
        balanceType = formData.opening_balance >= 0 ? 'credit' : 'debit';
      } else if (accountCodeNum >= 3000 && accountCodeNum <= 3999) {
        // Intäkter (Revenue) - normal balance is credit
        balanceType = formData.opening_balance >= 0 ? 'credit' : 'debit';
      } else if (accountCodeNum >= 4000 && accountCodeNum <= 4999 || accountCodeNum >= 6000 && accountCodeNum <= 6999) {
        // Kostnader (Expenses) - normal balance is debit
        balanceType = formData.opening_balance >= 0 ? 'debit' : 'credit';
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
          <h1 className="text-2xl font-semibold text-foreground">Ingående balanser</h1>
          <p className="text-muted-foreground mt-1">
            Registrera och hantera dina startbalanser enligt BAS 2024
          </p>
        </div>
        
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
                <Label htmlFor="account_code">Kontonummer</Label>
                <Input
                  id="account_code"
                  value={formData.account_code}
                  onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                  placeholder="t.ex. 1930"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name">Kontonamn</Label>
                <Input
                  id="account_name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="t.ex. Checkkonto"
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
                  Systemet bestämmer automatiskt debet/kredit baserat på kontotyp
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  className="flex items-center justify-between p-4 border border-border/20 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">
                        {balance.account_code} {balance.account_name}
                      </div>
                      <Badge 
                        variant={balance.balance_type === 'debit' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {balance.balance_type === 'debit' ? 'Debet' : 'Kredit'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`font-semibold text-lg ${
                      balance.balance_type === 'debit' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(balance.opening_balance)}
                    </div>
                    
                    <div className="flex gap-1">
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
  );
};

export default OpeningBalances;