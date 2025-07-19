
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, DollarSign, Save, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TransactionEntry {
  id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
  isNew?: boolean;
}

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  total_amount: number;
  transaction_type: string;
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
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
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

  const addNewEntry = () => {
    if (!editedTransaction) return;

    const newEntry: TransactionEntry = {
      id: `temp-${Date.now()}`,
      account_code: '',
      account_name: '',
      debit_amount: 0,
      credit_amount: 0,
      description: '',
      isNew: true,
    };

    setEditedTransaction({
      ...editedTransaction,
      entries: [...editedTransaction.entries, newEntry]
    });
  };

  const deleteEntry = (entryId: string) => {
    if (!editedTransaction) return;
    
    // Don't allow deletion if only 2 entries remain (minimum for double-entry)
    if (editedTransaction.entries.length <= 2) {
      toast({
        title: "Kan inte ta bort rad",
        description: "En transaktion måste ha minst två konteringsrader.",
        variant: "destructive",
      });
      return;
    }

    const updatedEntries = editedTransaction.entries.filter(entry => entry.id !== entryId);
    
    // Recalculate total amount correctly
    const totalDebit = updatedEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
    const totalCredit = updatedEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
    const newTotal = Math.max(totalDebit, totalCredit);
    
    setEditedTransaction({
      ...editedTransaction,
      entries: updatedEntries,
      total_amount: newTotal
    });
    
    setDeleteEntryId(null);
  };

  const handleSave = async () => {
    if (!editedTransaction) return;

    // Validate balance
    const totalDebit = editedTransaction.entries.reduce((sum, entry) => sum + entry.debit_amount, 0);
    const totalCredit = editedTransaction.entries.reduce((sum, entry) => sum + entry.credit_amount, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast({
        title: "Obalanserad transaktion",
        description: "Debet och kredit måste vara lika. Korrigera raderna innan du sparar.",
        variant: "destructive",
      });
      return;
    }

    // Validate that all entries have required fields
    const invalidEntries = editedTransaction.entries.filter(entry => 
      !entry.account_code || !entry.account_name || (entry.debit_amount === 0 && entry.credit_amount === 0)
    );
    
    if (invalidEntries.length > 0) {
      toast({
        title: "Ofullständiga rader",
        description: "Alla rader måste ha kontokod, kontonamn och ett belopp.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Calculate correct total amount
      const correctTotalAmount = Math.max(totalDebit, totalCredit);
      
      // Update transaction
      const { error: transactionError } = await supabase
        .from('airledger_transactions')
        .update({
          transaction_date: editedTransaction.transaction_date,
          description: editedTransaction.description,
          total_amount: correctTotalAmount,
          transaction_type: editedTransaction.transaction_type as "income" | "expense" | "transfer",
        })
        .eq('id', editedTransaction.id);

      if (transactionError) throw transactionError;

      // Handle entries: delete removed, update existing, insert new
      const originalEntryIds = transaction?.entries.map(e => e.id) || [];
      const currentEntryIds = editedTransaction.entries.filter(e => !e.isNew).map(e => e.id);
      const deletedEntryIds = originalEntryIds.filter(id => !currentEntryIds.includes(id));

      // Delete removed entries
      if (deletedEntryIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('airledger_entries')
          .delete()
          .in('id', deletedEntryIds);

        if (deleteError) throw deleteError;
      }

      // Update existing entries and insert new ones
      for (const entry of editedTransaction.entries) {
        if (entry.isNew) {
          // Insert new entry
          const { error: insertError } = await supabase
            .from('airledger_entries')
            .insert({
              transaction_id: editedTransaction.id,
              account_code: entry.account_code,
              account_name: entry.account_name,
              debit_amount: entry.debit_amount,
              credit_amount: entry.credit_amount,
              description: entry.description,
            });

          if (insertError) throw insertError;
        } else {
          // Update existing entry
          const { error: updateError } = await supabase
            .from('airledger_entries')
            .update({
              account_code: entry.account_code,
              account_name: entry.account_name,
              debit_amount: entry.debit_amount,
              credit_amount: entry.credit_amount,
              description: entry.description,
            })
            .eq('id', entry.id);

          if (updateError) throw updateError;
        }
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
    
    // Recalculate total amount correctly
    const totalDebit = updatedEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
    const totalCredit = updatedEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
    const newTotal = Math.max(totalDebit, totalCredit);
    
    setEditedTransaction({
      ...editedTransaction,
      entries: updatedEntries,
      total_amount: newTotal
    });
  };

  if (!editedTransaction) return null;

  const totalDebit = editedTransaction.entries.reduce((sum, entry) => sum + entry.debit_amount, 0);
  const totalCredit = editedTransaction.entries.reduce((sum, entry) => sum + entry.credit_amount, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <>
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
               </CardContent>
            </Card>

            {/* Accounting Entries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Konteringsrader
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addNewEntry}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Lägg till rad
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {editedTransaction.entries.map((entry, index) => (
                    <div key={entry.id} className={`p-4 border border-gray-200 rounded-lg ${entry.isNew ? 'border-blue-300 bg-blue-50' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 grid grid-cols-2 gap-4">
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
                        {editedTransaction.entries.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteEntryId(entry.id)}
                            className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
                      {entry.isNew && (
                        <div className="mt-2 text-sm text-blue-600 font-medium">
                          Ny rad - kommer att sparas
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Balance Check */}
                <div className={`mt-4 p-4 rounded-lg ${isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex justify-between text-sm">
                    <span>Total Debet:</span>
                    <span className="font-medium">
                      {totalDebit.toFixed(2)} kr
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Kredit:</span>
                    <span className="font-medium">
                      {totalCredit.toFixed(2)} kr
                    </span>
                  </div>
                  <div className={`border-t mt-2 pt-2 flex justify-between font-medium ${
                    isBalanced ? 'border-green-200' : 'border-red-200'
                  }`}>
                    <span>Balans:</span>
                    <span className={isBalanced ? "text-green-600" : "text-red-600"}>
                      {isBalanced ? "✓ Balanserad" : "⚠ Obalanserad"}
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
                disabled={isLoading || !isBalanced}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEntryId} onOpenChange={() => setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort konteringsrad</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort denna konteringsrad? Åtgärden kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEntryId && deleteEntry(deleteEntryId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TransactionEditDialog;
