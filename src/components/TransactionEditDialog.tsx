import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, DollarSign, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface TransactionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onTransactionUpdated: () => void;
}

const TransactionEditDialog = ({ open, onOpenChange, transaction, onTransactionUpdated }: TransactionEditDialogProps) => {
  const [editedTransaction, setEditedTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (transaction) {
      setEditedTransaction({ ...transaction });
    }
  }, [transaction]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from('airledger_chart_of_accounts')
          .select('account_code, account_name')
          .eq('is_active', true)
          .order('account_code');

        if (error) throw error;
        setAccounts(data || []);
      } catch (error) {
        console.error('Error fetching chart of accounts:', error);
      }
    };

    if (open) {
      fetchAccounts();
    }
  }, [open]);

  const handleSave = async () => {
    if (!editedTransaction) return;

    setIsLoading(true);
    try {
      // Update transaction
      const { error: transactionError } = await supabase
        .from('airledger_transactions')
        .update({
          transaction_date: editedTransaction.transaction_date,
          description: editedTransaction.description,
          total_amount: editedTransaction.total_amount,
          transaction_type: editedTransaction.transaction_type as "income" | "expense" | "transfer",
          status: editedTransaction.status as "draft" | "posted" | "reconciled",
        })
        .eq('id', editedTransaction.id);

      if (transactionError) throw transactionError;

      // Update entries
      for (const entry of editedTransaction.entries) {
        const { error: entryError } = await supabase
          .from('airledger_entries')
          .update({
            account_code: entry.account_code,
            account_name: entry.account_name,
            debit_amount: entry.debit_amount,
            credit_amount: entry.credit_amount,
            description: entry.description,
          })
          .eq('id', entry.id);

        if (entryError) throw entryError;
      }

      toast({
        title: "Transaktion uppdaterad!",
        description: `${editedTransaction.description} har sparats.`,
      });

      onTransactionUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Fel vid sparande",
        description: "Kunde inte spara ändringar. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateEntry = (index: number, field: keyof TransactionEntry, value: string | number) => {
    if (!editedTransaction) return;

    const updatedEntries = [...editedTransaction.entries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    
    // Auto-fill account name when account code changes
    if (field === 'account_code' && typeof value === 'string') {
      const account = accounts.find(acc => acc.account_code === value);
      if (account) {
        updatedEntries[index].account_name = account.account_name;
      }
    }
    
    // Recalculate total amount
    const newTotal = updatedEntries.reduce((sum, entry) => sum + Math.max(entry.debit_amount, entry.credit_amount), 0);
    
    setEditedTransaction({
      ...editedTransaction,
      entries: updatedEntries,
      total_amount: newTotal
    });
  };

  if (!editedTransaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Redigera transaktion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaktionsdetaljer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editedTransaction.transaction_date}
                    onChange={(e) => setEditedTransaction({
                      ...editedTransaction,
                      transaction_date: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Typ</Label>
                  <Select 
                    value={editedTransaction.transaction_type} 
                    onValueChange={(value) => setEditedTransaction({
                      ...editedTransaction,
                      transaction_type: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Kostnad</SelectItem>
                      <SelectItem value="income">Intäkt</SelectItem>
                      <SelectItem value="transfer">Överföring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                  id="description"
                  value={editedTransaction.description}
                  onChange={(e) => setEditedTransaction({
                    ...editedTransaction,
                    description: e.target.value
                  })}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={editedTransaction.status} 
                  onValueChange={(value) => setEditedTransaction({
                    ...editedTransaction,
                    status: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Utkast</SelectItem>
                    <SelectItem value="posted">Publicerad</SelectItem>
                    <SelectItem value="reconciled">Avstämd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Accounting Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Konteringsrader</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editedTransaction.entries.map((entry, index) => (
                  <div key={entry.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <Label>Kontokod</Label>
                        <Input
                          value={entry.account_code}
                          onChange={(e) => updateEntry(index, 'account_code', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Kontonamn</Label>
                        <Input
                          value={entry.account_name}
                          onChange={(e) => updateEntry(index, 'account_name', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <Label>Debet</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.debit_amount}
                          onChange={(e) => updateEntry(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Kredit</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.credit_amount}
                          onChange={(e) => updateEntry(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Beskrivning</Label>
                      <Input
                        value={entry.description || ''}
                        onChange={(e) => updateEntry(index, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Balance Check */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Total Debet:</span>
                  <span className="font-medium">
                    {editedTransaction.entries.reduce((sum, entry) => sum + entry.debit_amount, 0).toFixed(2)} kr
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Kredit:</span>
                  <span className="font-medium">
                    {editedTransaction.entries.reduce((sum, entry) => sum + entry.credit_amount, 0).toFixed(2)} kr
                  </span>
                </div>
                <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between font-medium">
                  <span>Balans:</span>
                  <span className={
                    Math.abs(editedTransaction.entries.reduce((sum, entry) => sum + entry.debit_amount - entry.credit_amount, 0)) < 0.01
                      ? "text-green-600" : "text-red-600"
                  }>
                    {Math.abs(editedTransaction.entries.reduce((sum, entry) => sum + entry.debit_amount - entry.credit_amount, 0)) < 0.01
                      ? "✓ Balanserad" : "⚠ Obalanserad"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Avbryt
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sparar...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Spara ändringar
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionEditDialog;