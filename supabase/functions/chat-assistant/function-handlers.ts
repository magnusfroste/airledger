import { FunctionCallArgs } from './types.ts';

export async function handleFunctionCall(
  functionName: string, 
  args: FunctionCallArgs, 
  supabase: any
): Promise<string> {
  let response = '';
  
  if (functionName === 'save_opening_balance') {
    try {
      console.log('Saving opening balance:', args);
      
      const { data: saveData, error: saveError } = await supabase.functions.invoke('save-opening-balance', {
        body: {
          accountCode: args.accountCode,
          accountName: args.accountName,
          amount: args.amount
        }
      });

      if (saveError) {
        console.error('Error saving opening balance:', saveError);
        response += `\n\n❌ Ett fel uppstod när jag försökte spara den ingående balansen: ${saveError.message}`;
      } else if (saveData?.success) {
        console.log('Opening balance saved successfully');
        response += `\n\n✅ Perfekt! Jag har sparat den ingående balansen för ${args.accountCode} ${args.accountName} med ${args.amount} kr.`;
      } else {
        response += `\n\n❌ Ett okänt fel uppstod när jag försökte spara den ingående balansen.`;
      }
    } catch (parseError) {
      console.error('Error parsing function arguments:', parseError);
      response += `\n\n❌ Ett fel uppstod när jag försökte tolka kontoinformationen.`;
    }
  } else if (functionName === 'save_invoice') {
    try {
      console.log('Saving invoice:', args);
      
      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('save-invoice', {
        body: {
          customerName: args.customerName,
          amount: args.amount,
          description: args.description,
          invoiceNumber: args.invoiceNumber,
          dueDate: args.dueDate,
          transactionDate: args.transactionDate
        }
      });

      if (invoiceError) {
        console.error('Error saving invoice:', invoiceError);
        response += `\n\n❌ Ett fel uppstod när jag försökte spara fakturan: ${invoiceError.message}`;
      } else if (invoiceData?.success) {
        console.log('Invoice saved successfully');
        const transaction = invoiceData.transaction;
        const analysisData = transaction.analysis_data;
        
        response += `\n\n✅ Perfekt! Jag har bokfört fakturan till ${args.customerName}.\n\n` +
          `**Belopp exkl. moms:** ${analysisData.amount_excl_vat} kr\n` +
          `**Moms (25%):** ${analysisData.vat_amount} kr\n` +
          `**Totalt inkl. moms:** ${analysisData.total_amount_incl_vat} kr\n\n` +
          `**Bokföringsposter:**\n` +
          `• Debet: 1510 Kundfordringar ${analysisData.total_amount_incl_vat} kr\n` +
          `• Kredit: 3000 Försäljning ${analysisData.amount_excl_vat} kr\n` +
          `• Kredit: 2640 Utgående moms ${analysisData.vat_amount} kr`;
      } else {
        response += `\n\n❌ Ett okänt fel uppstod när jag försökte spara fakturan.`;
      }
    } catch (parseError) {
      console.error('Error parsing invoice arguments:', parseError);
      response += `\n\n❌ Ett fel uppstod när jag försökte tolka fakturinformationen.`;
    }
  } else if (functionName === 'save_payment') {
    try {
      console.log('Saving payment:', args);
      
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('save-payment', {
        body: {
          customerName: args.customerName,
          amount: args.amount,
          description: args.description,
          transactionDate: args.transactionDate
        }
      });

      if (paymentError) {
        console.error('Error saving payment:', paymentError);
        response += `\n\n❌ Ett fel uppstod när jag försökte spara betalningen: ${paymentError.message}`;
      } else if (paymentData?.success) {
        console.log('Payment saved successfully');
        
        response += `\n\n✅ Perfekt! Jag har registrerat betalningen från ${args.customerName}.\n\n` +
          `**Belopp:** ${args.amount} kr\n\n` +
          `**Bokföringsposter:**\n` +
          `• Debet: 1930 Checkkonto ${args.amount} kr\n` +
          `• Kredit: 1510 Kundfordringar ${args.amount} kr\n\n` +
          `Kundfordringen har nu minskat och pengarna finns på ditt bankkonto.`;
      } else {
        response += `\n\n❌ Ett okänt fel uppstod när jag försökte spara betalningen.`;
      }
    } catch (parseError) {
      console.error('Error parsing payment arguments:', parseError);
      response += `\n\n❌ Ett fel uppstod när jag försökte tolka betalningsinformationen.`;
    }
  } else if (functionName === 'save_general_transaction') {
    try {
      console.log('Saving general transaction:', args);
      
      const { data: transactionData, error: transactionError } = await supabase.functions.invoke('save-general-transaction', {
        body: {
          description: args.description,
          entries: args.entries,
          transactionDate: args.transactionDate,
          referenceNumber: args.referenceNumber
        }
      });

      if (transactionError) {
        console.error('Error saving general transaction:', transactionError);
        response += `\n\n❌ Ett fel uppstod när jag försökte spara transaktionen: ${transactionError.message}`;
      } else if (transactionData?.success) {
        console.log('General transaction saved successfully');
        const transaction = transactionData.transaction;
        
        response += `\n\n✅ Perfekt! Jag har bokfört transaktionen.\n\n` +
          `**Beskrivning:** ${args.description}\n` +
          `**Datum:** ${transaction.transaction_date}\n\n` +
          `**Bokföringsposter:**\n` +
          args.entries.map((entry: any) => 
            `• ${entry.debitAmount > 0 ? 'Debet' : 'Kredit'}: ${entry.accountCode} ${entry.accountName} ${entry.debitAmount || entry.creditAmount} kr`
          ).join('\n');
        } else {
        response += `\n\n❌ Ett okänt fel uppstod när jag försökte spara transaktionen.`;
      }
    } catch (parseError) {
      console.error('Error parsing general transaction arguments:', parseError);
      response += `\n\n❌ Ett fel uppstod när jag försökte tolka transaktionsinformationen.`;
    }
  } else if (functionName === 'use_transaction_template') {
    try {
      console.log('Using transaction template:', args);
      
      const { data: templateData, error: templateError } = await supabase.functions.invoke('use-transaction-template', {
        body: {
          templateName: args.templateName,
          amount: args.amount,
          description: args.description,
          transactionDate: args.transactionDate,
          referenceNumber: args.referenceNumber
        }
      });

      if (templateError) {
        console.error('Error using transaction template:', templateError);
        response += `\n\n❌ Ett fel uppstod när jag försökte använda mallen: ${templateError.message}`;
      } else if (templateData?.success) {
        console.log('Transaction template used successfully');
        const transaction = templateData.transaction;
        
        response += `\n\n✅ Perfekt! Jag har använt mallen "${args.templateName}" för att bokföra transaktionen.\n\n` +
          `**Belopp:** ${args.amount} kr\n` +
          `**Datum:** ${transaction.transaction_date}\n` +
          `**Mall:** ${templateData.template_used}\n\n` +
          `Transaktionen är nu bokförd enligt mallen.`;
      } else {
        response += `\n\n❌ Ett okänt fel uppstod när jag försökte använda transaktionsmallen.`;
      }
    } catch (parseError) {
      console.error('Error parsing template arguments:', parseError);
      response += `\n\n❌ Ett fel uppstod när jag försökte tolka mallinformationen.`;
    }
  }

  return response;
}