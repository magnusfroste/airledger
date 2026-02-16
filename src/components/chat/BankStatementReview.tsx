import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Building2, ArrowUpRight, ArrowDownLeft, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

interface BookingProgress {
  current: number;
  total: number;
  errors: Map<number, string>;
}

interface BankStatementReviewProps {
  analysis: BankStatementAnalysis;
  onConfirmSelected: (transactions: BankTransaction[]) => void;
  onDismiss: () => void;
  isLoading: boolean;
  bookingProgress?: BookingProgress;
  isDone?: boolean;
}

const BankStatementReview = ({
  analysis,
  onConfirmSelected,
  onDismiss,
  isLoading,
  bookingProgress,
  isDone,
}: BankStatementReviewProps) => {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(analysis.transactions.map((_, i) => i))
  );

  const toggleSelect = (index: number) => {
    if (isLoading || isDone) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (isLoading || isDone) return;
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

  const progressPercent = bookingProgress
    ? (bookingProgress.current / bookingProgress.total) * 100
    : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">
          {analysis.bank_name || "Bankutdrag"} — {analysis.transactions.length} transaktioner
        </span>
      </div>
      {analysis.period && (
        <p className="text-xs text-muted-foreground">Period: {analysis.period}</p>
      )}

      {/* Instruction */}
      {!isDone && !isLoading && (
        <p className="text-xs text-muted-foreground italic">
          Avmarkera rader du inte vill bokföra
        </p>
      )}

      {/* Progress bar during booking */}
      {isLoading && bookingProgress && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Bokför {bookingProgress.current} av {bookingProgress.total}...</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      )}

      {/* Select all */}
      {!isDone && (
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Checkbox
              checked={selected.size === analysis.transactions.length}
              onCheckedChange={toggleAll}
              disabled={isLoading}
            />
            Markera alla
          </label>
          <span className="text-xs text-muted-foreground">
            {selected.size} av {analysis.transactions.length} valda
          </span>
        </div>
      )}

      {/* Transaction rows */}
      <div className="max-h-[300px] overflow-y-auto space-y-1">
        {analysis.transactions.map((tx, i) => {
          const hasError = bookingProgress?.errors.has(i);
          const errorMsg = bookingProgress?.errors.get(i);
          const isBooked = isDone && !hasError;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                hasError
                  ? "bg-destructive/10 border border-destructive/30"
                  : isBooked
                  ? "bg-green-500/10 opacity-70"
                  : selected.has(i)
                  ? "bg-primary/5 cursor-pointer"
                  : "bg-muted/20 opacity-60 cursor-pointer"
              }`}
              onClick={() => toggleSelect(i)}
            >
              {!isDone && (
                <Checkbox
                  checked={selected.has(i)}
                  onCheckedChange={() => toggleSelect(i)}
                  disabled={isLoading}
                />
              )}
              {isDone && !hasError && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
              {hasError && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
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
                {hasError && (
                  <p className="text-[10px] text-destructive mt-0.5">{errorMsg}</p>
                )}
              </div>
              <span
                className={`font-semibold tabular-nums shrink-0 ${
                  tx.type === "income" ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.type === "income" ? "+" : "−"}{tx.amount.toLocaleString("sv-SE")} kr
              </span>
            </div>
          );
        })}
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
      {!isDone && (
        <div className="flex gap-2 pt-2">
          <Button
            size="lg"
            className="flex-1 rounded-full text-sm h-10"
            onClick={handleConfirm}
            disabled={selected.size === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Bokför...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Bokför {selected.size} transaktioner
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs h-10 text-muted-foreground"
            onClick={onDismiss}
            disabled={isLoading}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Avbryt
          </Button>
        </div>
      )}
    </div>
  );
};

export default BankStatementReview;
