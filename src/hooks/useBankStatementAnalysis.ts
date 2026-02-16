import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "./useMessages";

export interface BankTransaction {
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

export interface BankStatementAnalysis {
  bank_name: string;
  account_number?: string;
  period?: string;
  transactions: BankTransaction[];
  total_transactions: number;
  summary: string;
}

export const useBankStatementAnalysis = () => {
  const [bankAnalysis, setBankAnalysis] = useState<BankStatementAnalysis | null>(null);
  const [isBankReviewVisible, setIsBankReviewVisible] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const { toast } = useToast();

  const analyzeBankStatement = async (
    imageBase64: string,
    onMessage: (message: Message) => void,
    saveMessage: (message: Message) => Promise<void>
  ) => {
    const { data, error } = await supabase.functions.invoke("analyze-bank-statement", {
      body: { imageBase64 },
    });

    if (error) {
      console.error("Bank statement analysis error:", error);
      // Try to extract specific error from response
      let specificError = "Kunde inte analysera bankutdraget";
      try {
        const errorData = typeof error.context === 'object' ? error.context : null;
        if (data?.error) {
          specificError = data.error;
        } else if (errorData) {
          specificError = JSON.stringify(errorData);
        }
      } catch {}

      const errorMsg: Message = {
        id: (Date.now() + Math.random()).toString(),
        content: `⚠️ **Bankutdragsanalys misslyckades**\n\n${specificError}\n\nTips: Försök med en tydligare bild eller ett mindre utdrag.`,
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      onMessage(errorMsg);
      await saveMessage(errorMsg);
      return null;
    }

    if (data?.success && data?.analysis) {
      const analysis: BankStatementAnalysis = data.analysis;
      setBankAnalysis(analysis);
      setIsBankReviewVisible(true);

      const msg: Message = {
        id: (Date.now() + Math.random()).toString(),
        content: `🏦 **Bankutdrag analyserat!**\n\n**${analysis.bank_name || "Bank"}** ${analysis.period ? `— ${analysis.period}` : ""}\n**${analysis.transactions.length} transaktioner** hittade.\n\nGranska och välj vilka du vill bokföra nedan.`,
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };

      onMessage(msg);
      await saveMessage(msg);

      toast({
        title: "Bankutdrag analyserat!",
        description: `${analysis.transactions.length} transaktioner hittade`,
      });

      return analysis;
    } else {
      throw new Error("Invalid response from bank statement analysis");
    }
  };

  const saveBatchTransactions = async (
    transactions: BankTransaction[],
    onMessage: (message: Message) => void,
    saveMessage: (message: Message) => Promise<void>
  ) => {
    setIsSavingBatch(true);
    let savedCount = 0;
    const errors: string[] = [];

    try {
      for (const tx of transactions) {
        const netAmount = tx.vat_applicable
          ? tx.amount / (1 + tx.vat_rate / 100)
          : tx.amount;
        const vatAmount = tx.vat_applicable ? tx.amount - netAmount : 0;

        const entries = [];

        if (tx.type === "expense") {
          entries.push({
            account_code: tx.suggested_account_code,
            account_name: tx.suggested_account_name,
            debit_amount: parseFloat(netAmount.toFixed(2)),
            credit_amount: 0,
            description: tx.description,
          });
          if (vatAmount > 0) {
            entries.push({
              account_code: "2641",
              account_name: "Ingående moms",
              debit_amount: parseFloat(vatAmount.toFixed(2)),
              credit_amount: 0,
              description: `Ingående moms ${tx.vat_rate}%`,
            });
          }
          entries.push({
            account_code: tx.counterpart_account_code || "1930",
            account_name: tx.counterpart_account_name || "Bankkonto",
            debit_amount: 0,
            credit_amount: tx.amount,
            description: "Bankbetalning",
          });
        } else {
          // income
          entries.push({
            account_code: tx.counterpart_account_code || "1930",
            account_name: tx.counterpart_account_name || "Bankkonto",
            debit_amount: tx.amount,
            credit_amount: 0,
            description: "Insättning bank",
          });
          entries.push({
            account_code: tx.suggested_account_code,
            account_name: tx.suggested_account_name,
            debit_amount: 0,
            credit_amount: tx.amount,
            description: tx.description,
          });
        }

        const analysis = {
          vendor: tx.description,
          date: tx.date,
          total_amount: tx.amount,
          description: tx.description,
          document_type: "bank_statement",
          entries,
        };

        try {
          const { error } = await supabase.functions.invoke("save-transaction", {
            body: { analysis, entries, paymentMethod: "bank" },
          });
          if (error) throw error;
          savedCount++;
        } catch (e: any) {
          errors.push(`${tx.description}: ${e.message}`);
        }
      }

      setIsBankReviewVisible(false);
      setBankAnalysis(null);

      const resultMsg: Message = {
        id: (Date.now() + Math.random()).toString(),
        content: `✅ **${savedCount} av ${transactions.length} transaktioner bokförda!**${errors.length > 0 ? `\n\n⚠️ ${errors.length} fel:\n${errors.map((e) => `• ${e}`).join("\n")}` : ""}`,
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };

      onMessage(resultMsg);
      await saveMessage(resultMsg);

      toast({
        title: `${savedCount} transaktioner bokförda`,
        description: errors.length > 0 ? `${errors.length} misslyckades` : undefined,
        variant: errors.length > 0 ? "destructive" : "default",
      });
    } finally {
      setIsSavingBatch(false);
    }
  };

  const dismissBankReview = () => {
    setIsBankReviewVisible(false);
    setBankAnalysis(null);
  };

  return {
    bankAnalysis,
    isBankReviewVisible,
    isSavingBatch,
    analyzeBankStatement,
    saveBatchTransactions,
    dismissBankReview,
  };
};
