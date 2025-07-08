import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "./useMessages";

export const useReceiptAnalysis = () => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const analyzeReceipt = async (
    imageBase64: string,
    uploadedImage: any,
    onMessage: (message: Message) => void,
    saveMessage: (message: Message) => Promise<void>
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-receipt', {
        body: { imageBase64 }
      });

      if (error) {
        console.error('Error analyzing receipt:', error);
        throw new Error(error.message || 'Failed to analyze receipt');
      }

      if (data?.success && data?.analysis) {
        const analysis = data.analysis;

        // Add image metadata to analysis for permanent storage link
        if (uploadedImage?.metadata) {
          analysis.image_metadata = uploadedImage.metadata;
          analysis.storage_path = uploadedImage.storagePath;
          analysis.thumbnail_path = uploadedImage.thumbnailPath;
        }

        // Show confirmation dialog instead of auto-saving
        setPendingAnalysis(analysis);
        setConfirmDialogOpen(true);

        const aiResponse: Message = {
          id: (Date.now() + Math.random()).toString(),
          content: `🎯 **Kvittoanalys klar!**\n\n**${analysis.vendor}** - ${analysis.date}\n**Belopp:** ${analysis.total_amount} kr\n**Dokumenttyp:** ${analysis.document_type === 'receipt' ? 'Kvitto' : 'Faktura'} (${analysis.document_type_confidence}% säkerhet)\n\n**Föreslaget betalningssätt:** ${analysis.suggested_payment_method}\n\n📋 Klicka "Bekräfta bokföring" för att granska och spara transaktionen.`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };

        onMessage(aiResponse);
        await saveMessage(aiResponse);

        toast({
          title: "Kvitto analyserat!",
          description: `${analysis.vendor} - Väntar på bekräftelse`
        });
      } else {
        throw new Error('Invalid response from analysis');
      }
    } catch (imageError) {
      console.error('Error processing image:', imageError);
      const errorResponse: Message = {
        id: (Date.now() + Math.random()).toString(),
        content: `❌ **Fel vid analys av kvitto**\n\nJag kunde inte analysera bilden. Kontrollera att det är ett tydligt kvitto och försök igen.\n\nFelmeddelande: ${imageError.message}`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };

      onMessage(errorResponse);
      await saveMessage(errorResponse);

      toast({
        title: "Analysfel",
        description: "Kunde inte analysera kvittot. Försök igen.",
        variant: "destructive"
      });
    }
  };

  const handleTransactionConfirm = async (
    analysis: any,
    entries: any[],
    paymentMethod: string,
    onMessage: (message: Message) => void,
    saveMessage: (message: Message) => Promise<void>
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('save-transaction', {
        body: { analysis, entries, paymentMethod }
      });

      if (error) {
        throw new Error(error.message || 'Failed to save transaction');
      }

      if (data?.success && data?.transaction) {
        const aiResponse: Message = {
          id: (Date.now() + Math.random()).toString(),
          content: `✅ **Transaktion bokförd!**\n\n**${analysis.vendor}** - ${analysis.date}\n**Belopp:** ${analysis.total_amount} kr\n**Betalning:** ${paymentMethod}\n\n**Bokföringsposter:**\n${entries.map((entry: any) => `• ${entry.account_code} ${entry.account_name}: ${entry.debit_amount > 0 ? `Debet ${entry.debit_amount} kr` : `Kredit ${entry.credit_amount} kr`}`).join('\n')}\n\n📋 Transaktionen är nu bokförd i systemet.`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };

        onMessage(aiResponse);
        await saveMessage(aiResponse);
      }
    } catch (error) {
      throw error;
    }
  };

  return {
    confirmDialogOpen,
    setConfirmDialogOpen,
    pendingAnalysis,
    analyzeReceipt,
    handleTransactionConfirm
  };
};