import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Receipt, CreditCard, Banknote, Building2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TransactionEntry {
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

interface Analysis {
  vendor: string;
  date: string;
  total_amount: number;
  description: string;
  document_type: 'receipt' | 'invoice';
  document_type_confidence: number;
  suggested_payment_method: string;
  entries: TransactionEntry[];
  confidence: number;
}

interface TransactionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: Analysis | null;
  onConfirm: (analysis: Analysis, entries: TransactionEntry[], paymentMethod: string) => Promise<void>;
}

const paymentMethods = [
  { value: 'bank', label: 'Bankkonto (1930)', icon: Building2, account: '1930', description: 'Kort/bankbetalning' },
  { value: 'cash', label: 'Kassa (1910)', icon: Banknote, account: '1910', description: 'Kontant betalning' },
  { value: 'expense', label: 'Utlägg (2640)', icon: Wallet, account: '2640', description: 'Privat utlägg att ersätta' },
  { value: 'unpaid', label: 'Ej betald (2640)', icon: FileText, account: '2640', description: 'Faktura att betala' },
];

const TransactionConfirmDialog = ({ open, onOpenChange, analysis, onConfirm }: TransactionConfirmDialogProps) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [entries, setEntries] = useState<TransactionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize entries when analysis changes
  useEffect(() => {
    if (analysis) {
      setEntries(analysis.entries);
      setSelectedPaymentMethod(analysis.suggested_payment_method || 'bank');
    }
  }, [analysis]);

  const updateCreditEntry = (paymentMethod: string) => {
    if (!analysis) return;

    const method = paymentMethods.find(m => m.value === paymentMethod);
    if (!method) return;

    const updatedEntries = entries.map((entry, index) => {
      if (index === entries.length - 1) { // Last entry is usually the credit entry
        return {
          ...entry,
          account_code: method.account,
          account_name: method.label.split(' (')[0],
          description: method.description
        };
      }
      return entry;
    });

    setEntries(updatedEntries);
  };

  const handlePaymentMethodChange = (value: string) => {
    setSelectedPaymentMethod(value);
    updateCreditEntry(value);
  };

  const handleConfirm = async () => {
    if (!analysis || !selectedPaymentMethod) return;

    setIsLoading(true);
    try {
      await onConfirm(analysis, entries, selectedPaymentMethod);
      onOpenChange(false);
      toast({
        title: "Transaktion sparad!",
        description: `${analysis.vendor} - ${analysis.total_amount} kr`,
      });
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Fel vid sparande",
        description: "Kunde inte spara transaktionen. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!analysis) return null;

  const DocumentIcon = analysis.document_type === 'receipt' ? Receipt : FileText;
  const isHighConfidence = analysis.confidence > 80;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentIcon className="h-5 w-5" />
            Bekräfta bokföring
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Analyserat dokument
                <Badge variant={isHighConfidence ? "default" : "secondary"}>
                  {analysis.confidence}% säkerhet
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Leverantör</Label>
                  <p className="text-sm">{analysis.vendor}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Datum</Label>
                  <p className="text-sm">{analysis.date}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Belopp</Label>
                  <p className="text-sm font-semibold">{analysis.total_amount} kr</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Dokumenttyp</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={analysis.document_type === 'receipt' ? "default" : "secondary"}>
                      {analysis.document_type === 'receipt' ? 'Kvitto' : 'Faktura'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {analysis.document_type_confidence}%
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Beskrivning</Label>
                <p className="text-sm">{analysis.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Betalningssätt</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPaymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj betalningssätt" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{method.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Accounting Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Föreslagna verifikationsrader</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{entry.account_code}</Badge>
                        <span className="font-medium">{entry.account_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                    </div>
                    <div className="text-right">
                      {entry.debit_amount > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Debet:</span>
                          <span className="font-medium ml-1">{entry.debit_amount} kr</span>
                        </div>
                      )}
                      {entry.credit_amount > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Kredit:</span>
                          <span className="font-medium ml-1">{entry.credit_amount} kr</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Balance Check */}
              <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Total Debet:</span>
                  <span className="font-medium">
                    {entries.reduce((sum, entry) => sum + entry.debit_amount, 0)} kr
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Kredit:</span>
                  <span className="font-medium">
                    {entries.reduce((sum, entry) => sum + entry.credit_amount, 0)} kr
                  </span>
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                  <span>Balans:</span>
                  <span className={
                    Math.abs(entries.reduce((sum, entry) => sum + entry.debit_amount - entry.credit_amount, 0)) < 0.01
                      ? "text-green-600" : "text-red-600"
                  }>
                    {Math.abs(entries.reduce((sum, entry) => sum + entry.debit_amount - entry.credit_amount, 0)) < 0.01
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
              onClick={handleConfirm}
              disabled={!selectedPaymentMethod || isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? "Sparar..." : "Spara transaktion"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionConfirmDialog;