import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Building2, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: "expense" | "income";
  suggested_category: string;
  suggested_account_code: string;
  suggested_account_name: string;
  counterpart_account_code: string;
  counterpart_account_name: string;
  vat_applicable: boolean;
  vat_rate: number;
  confidence: number;
}

interface BankStatementAnalysis {
  bank_name: string;
  account_number?: string;
  period?: string;
  transactions: BankTransaction[];
  total_transactions: number;
  summary: string;
}

interface BankStatementReviewProps {
  analysis: BankStatementAnalysis;
  onConfirmSelected: (transactions: BankTransaction[]) => void;
  onDismiss: () => void;
  isLoading: boolean;
}

const BankStatementReview = ({
  analysis,
  onConfirmSelected,
  onDismiss,
  isLoading,
}: BankStatementReviewProps) => {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(analysis.transactions.map((_, i) => i))
  );

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === analysis.transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(analysis.transactions.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    const selectedTx = analysis.transactions.filter((_, i) => selected.has(i));
    onConfirmSelected(selectedTx);
  };

  const totalIncome = analysis.transactions
    .filter((_, i) => selected.has(i))
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = analysis.transactions
    .filter((_, i) => selected.has(i))
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {analysis.bank_name || "Bankutdrag"} — {analysis.transactions.length} transaktioner
        </CardTitle>
        {analysis.period && (
          <p className="text-xs text-muted-foreground">Period: {analysis.period}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Select all */}
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Checkbox
              checked={selected.size === analysis.transactions.length}
              onCheckedChange={toggleAll}
            />
            Markera alla
          </label>
          <span className="text-xs text-muted-foreground">
            {selected.size} av {analysis.transactions.length} valda
          </span>
        </div>

        {/* Transaction rows */}
        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {analysis.transactions.map((tx, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                selected.has(i) ? "bg-primary/5" : "bg-muted/20 opacity-60"
              }`}
              onClick={() => toggleSelect(i)}
            >
              <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleSelect(i)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {tx.type === "income" ? (
                    <ArrowDownLeft className="h-3 w-3 text-green-500 shrink-0" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3 text-red-500 shrink-0" />
                  )}
                  <span className="truncate font-medium">{tx.description}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{tx.date}</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {tx.suggested_account_code}
                  </Badge>
                </div>
              </div>
              <span
                className={`font-semibold tabular-nums shrink-0 ${
                  tx.type === "income" ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.type === "income" ? "+" : "−"}{tx.amount.toLocaleString("sv-SE")} kr
              </span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-2 border-t border-border/40 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Inkomster:</span>
            <span className="text-green-600 font-medium">+{totalIncome.toLocaleString("sv-SE")} kr</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Utgifter:</span>
            <span className="text-red-600 font-medium">−{totalExpense.toLocaleString("sv-SE")} kr</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1 rounded-full text-xs h-8"
            onClick={handleConfirm}
            disabled={selected.size === 0 || isLoading}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {isLoading ? "Bokför..." : `Bokför ${selected.size} transaktioner`}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs h-8 text-muted-foreground"
            onClick={onDismiss}
            disabled={isLoading}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Avbryt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BankStatementReview;
