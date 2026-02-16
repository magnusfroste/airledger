import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Message, BankTransaction, BankStatementAnalysis } from "./useMessages";

export type { BankTransaction, BankStatementAnalysis };

export const useBankStatementAnalysis = () => {
  const { toast } = useToast();

  const analyzeBankStatement = async (
    imageBase64: string,
    onMessage: (message: Message) => void,
    saveMessage: (message: Message) => Promise<void>
  ): Promise<BankStatementAnalysis | null> => {
    const { data, error } = await supabase.functions.invoke("analyze-bank-statement", {
      body: { imageBase64 },
    });

    if (error) {
      console.error("Bank statement analysis error:", error);
      let specificError = "Kunde inte analysera bankutdraget";
      try {
        if (data?.error) {
          specificError = data.error;
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

      // Create a bank_review message with analysis data embedded
      const msg: Message = {
        id: (Date.now() + Math.random()).toString(),
        content: `🏦 **Bankutdrag analyserat!**\n\n**${analysis.bank_name || "Bank"}** ${analysis.period ? `— ${analysis.period}` : ""}\n**${analysis.transactions.length} transaktioner** hittade.`,
        sender: "ai",
        timestamp: new Date(),
        type: "bank_review",
        bankAnalysis: analysis,
        bankReviewStatus: 'pending',
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
    saveMessage: (message: Message) => Promise<void>,
    onProgress?: (current: number, total: number, errors: Map<number, string>) => void
  ) => {
    let savedCount = 0;
    const errors = new Map<number, string>();

    for (let idx = 0; idx < transactions.length; idx++) {
      const tx = transactions[idx];
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
        errors.set(idx, e.message || "Okänt fel");
      }

      onProgress?.(idx + 1, transactions.length, errors);
    }

    const resultMsg: Message = {
      id: (Date.now() + Math.random()).toString(),
      content: `✅ **${savedCount} av ${transactions.length} transaktioner bokförda!**${errors.size > 0 ? `\n\n⚠️ ${errors.size} fel` : ""}`,
      sender: "ai",
      timestamp: new Date(),
      type: "text",
    };

    onMessage(resultMsg);
    await saveMessage(resultMsg);

    toast({
      title: `${savedCount} transaktioner bokförda`,
      description: errors.size > 0 ? `${errors.size} misslyckades` : undefined,
      variant: errors.size > 0 ? "destructive" : "default",
    });

    return { savedCount, errors };
  };

  return {
    analyzeBankStatement,
    saveBatchTransactions,
  };
};
