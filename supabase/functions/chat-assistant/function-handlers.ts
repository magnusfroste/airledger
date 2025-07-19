
import { FunctionCallArgs } from './types.ts';
import { isDuplicateCall, markCallAsExecuted, getPreviousCallResult } from './deduplication.ts';

export async function handleFunctionCall(
  functionName: string, 
  args: FunctionCallArgs, 
  supabase: any,
  conversationId?: string
): Promise<string> {
  // Kontrollera om detta är ett duplikat av en tidigare call
  if (isDuplicateCall(functionName, args, conversationId)) {
    console.log('Duplicate function call prevented:', functionName, args);
    const previousResult = getPreviousCallResult(functionName, args, conversationId);
    
    if (previousResult) {
      return `\n\n✅ Transaktionen är redan genomförd (undviker dublett).`;
    }
    
    return `\n\n⚠️ Denna transaktion verkar redan vara genomförd. Kontrollera dina transaktioner för att undvika dubbletter.`;
  }
  
  let response = '';
  let callResult = null;
  
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
        callResult = { success: false, error: saveError.message };
      } else if (saveData?.success) {
        console.log('Opening balance saved successfully');
        response += `\n\n✅ Perfekt! Jag har sparat den ingående balansen för ${args.accountCode} ${args.accountName} med ${args.amount} kr.`;
        callResult = { success: true, data: saveData };
      } else {
        response += `\n\n❌ Ett okänt fel uppstod när jag försökte spara den ingående balansen.`;
        callResult = { success: false, error: 'Unknown error' };
      }
    } catch (parseError) {
      console.error('Error parsing function arguments:', parseError);
      response += `\n\n❌ Ett fel uppstod när jag försökte tolka kontoinformationen.`;
      callResult = { success: false, error: parseError.message };
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
        callResult = { success: false, error: transactionError.message };
      } else if (transactionData?.success) {
        console.log('General transaction saved successfully');
        const transaction = transactionData.transaction;
        
        response += `\n\n✅ Perfekt! Jag har bokfört transaktionen.\n\n` +
          `**Beskrivning:** ${args.description}\n` +
          `**Datum:** ${transaction.transaction_date}\n\n` +
          `**Bokföringsposterna som skapades:**\n` +
          args.entries.map((entry: any) => 
            `• ${entry.debitAmount > 0 ? 'Debet' : 'Kredit'}: ${entry.accountCode} ${entry.accountName} ${entry.debitAmount || entry.creditAmount} kr`
          ).join('\n');
        callResult = { success: true, data: transactionData };
      } else {
        response += `\n\n❌ Ett okänt fel uppstod när jag försökte spara transaktionen.`;
        callResult = { success: false, error: 'Unknown error' };
      }
    } catch (parseError) {
      console.error('Error parsing general transaction arguments:', parseError);
      response += `\n\n❌ Ett fel uppstod när jag försökte tolka transaktionsinformationen.`;
      callResult = { success: false, error: parseError.message };
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
        callResult = { success: false, error: templateError.message };
      } else if (templateData?.success) {
        console.log('Transaction template used successfully');
        const transaction = templateData.transaction;
        
        response += `\n\n✅ Perfekt! Jag har använt mallen "${args.templateName}" för att bokföra transaktionen.\n\n` +
          `**Mall:** ${templateData.template_used}\n` +
          `**Belopp:** ${args.amount} kr\n` +
          `**Datum:** ${transaction.transaction_date}\n\n` +
          `Transaktionen är nu bokförd enligt mallens struktur som jag visade tidigare.`;
        callResult = { success: true, data: templateData };
      } else {
        response += `\n\n❌ Ett okänt fel uppstod när jag försökte använda transaktionsmallen.`;
        callResult = { success: false, error: 'Unknown error' };
      }
    } catch (parseError) {
      console.error('Error parsing template arguments:', parseError);
      response += `\n\n❌ Ett fel uppstod när jag försökte tolka mallinformationen.`;
      callResult = { success: false, error: parseError.message };
    }
  }

  // Markera denna call som genomförd för att förhindra dubbletter
  if (callResult) {
    markCallAsExecuted(functionName, args, callResult, conversationId);
  }

  return response;
}
