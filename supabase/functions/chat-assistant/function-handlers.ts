
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
  } else if (functionName === 'calculate_vat_report') {
    try {
      console.log('Calculating VAT report:', args);
      const periodStart = args.periodStart;
      const periodEnd = args.periodEnd;

      // Get all entries on VAT accounts for the period
      const { data: vatEntries, error: vatError } = await supabase
        .from('airledger_entries')
        .select('account_code, account_name, debit_amount, credit_amount, airledger_transactions!inner(transaction_date, user_id)')
        .gte('airledger_transactions.transaction_date', periodStart)
        .lte('airledger_transactions.transaction_date', periodEnd);

      if (vatError) {
        response += `\n\n❌ Kunde inte hämta momsdata: ${vatError.message}`;
        callResult = { success: false, error: vatError.message };
      } else {
        // Filter VAT accounts (2610-2650)
        const vatData = (vatEntries || []).filter((e: any) => {
          const code = parseInt(e.account_code);
          return code >= 2610 && code <= 2650;
        });

        let outputVat = 0; // Utgående moms (2610, 2611, 2612)
        let inputVat = 0;  // Ingående moms (2640, 2641)

        for (const entry of vatData) {
          const code = parseInt(entry.account_code);
          if (code >= 2610 && code <= 2619) {
            // Utgående moms — credit increases liability
            outputVat += (entry.credit_amount || 0) - (entry.debit_amount || 0);
          } else if (code >= 2640 && code <= 2649) {
            // Ingående moms — debit increases asset
            inputVat += (entry.debit_amount || 0) - (entry.credit_amount || 0);
          }
        }

        const netVat = outputVat - inputVat;
        const direction = netVat >= 0 ? 'betala' : 'få tillbaka';

        response += `\n\n📊 **Momsrapport ${periodStart} — ${periodEnd}**\n\n` +
          `| Post | Belopp |\n|------|--------|\n` +
          `| Utgående moms (2610–2619) | ${outputVat.toLocaleString('sv-SE')} kr |\n` +
          `| Ingående moms (2640–2649) | ${inputVat.toLocaleString('sv-SE')} kr |\n` +
          `| **Moms att ${direction}** | **${Math.abs(netVat).toLocaleString('sv-SE')} kr** |\n\n` +
          `Antal momsposter i perioden: ${vatData.length}`;
        callResult = { success: true, data: { outputVat, inputVat, netVat } };
      }
    } catch (err) {
      console.error('VAT report error:', err);
      response += `\n\n❌ Ett fel uppstod vid momsberäkning.`;
      callResult = { success: false, error: err.message };
    }
  } else if (functionName === 'calculate_account_balance') {
    try {
      console.log('Calculating account balance:', args);
      const accountCode = args.accountCode;
      const periodStart = args.periodStart || `${new Date().getFullYear()}-01-01`;
      const periodEnd = args.periodEnd || new Date().toISOString().split('T')[0];

      // Get opening balance
      const { data: opening } = await supabase
        .from('airledger_opening')
        .select('opening_balance')
        .eq('account_code', accountCode)
        .single();

      const ib = opening?.opening_balance || 0;

      // Get all entries for this account in the period
      const { data: entries, error: entriesError } = await supabase
        .from('airledger_entries')
        .select('debit_amount, credit_amount, airledger_transactions!inner(transaction_date)')
        .eq('account_code', accountCode)
        .gte('airledger_transactions.transaction_date', periodStart)
        .lte('airledger_transactions.transaction_date', periodEnd);

      if (entriesError) {
        response += `\n\n❌ Kunde inte hämta kontosaldo: ${entriesError.message}`;
        callResult = { success: false, error: entriesError.message };
      } else {
        let totalDebit = 0;
        let totalCredit = 0;
        for (const e of (entries || [])) {
          totalDebit += e.debit_amount || 0;
          totalCredit += e.credit_amount || 0;
        }
        const ub = ib + totalDebit - totalCredit;

        // Get account name from chart
        const { data: account } = await supabase
          .from('airledger_chart_of_accounts')
          .select('account_name')
          .eq('account_code', accountCode)
          .single();

        const name = account?.account_name || accountCode;

        response += `\n\n📊 **Kontosaldo: ${accountCode} ${name}**\n` +
          `Period: ${periodStart} — ${periodEnd}\n\n` +
          `| Post | Belopp |\n|------|--------|\n` +
          `| Ingående balans | ${ib.toLocaleString('sv-SE')} kr |\n` +
          `| Debet under perioden | ${totalDebit.toLocaleString('sv-SE')} kr |\n` +
          `| Kredit under perioden | ${totalCredit.toLocaleString('sv-SE')} kr |\n` +
          `| **Utgående balans** | **${ub.toLocaleString('sv-SE')} kr** |\n\n` +
          `Antal poster: ${(entries || []).length}`;
        callResult = { success: true, data: { ib, totalDebit, totalCredit, ub } };
      }
    } catch (err) {
      console.error('Account balance error:', err);
      response += `\n\n❌ Ett fel uppstod vid saldoberäkning.`;
      callResult = { success: false, error: err.message };
    }
  } else if (functionName === 'get_year_end_checklist') {
    try {
      const year = args.fiscalYear;
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      // Count transactions for the year
      const { count: txCount } = await supabase
        .from('airledger_transactions')
        .select('id', { count: 'exact', head: true })
        .gte('transaction_date', yearStart)
        .lte('transaction_date', yearEnd);

      // Check for entries on depreciation accounts (7800-7899)
      const { data: depEntries } = await supabase
        .from('airledger_entries')
        .select('id, airledger_transactions!inner(transaction_date)')
        .gte('account_code', '7800')
        .lte('account_code', '7899')
        .gte('airledger_transactions.transaction_date', yearStart)
        .lte('airledger_transactions.transaction_date', yearEnd)
        .limit(1);

      const hasDepreciation = (depEntries?.length || 0) > 0;

      // Check for accrual entries (1700-1799, 2900-2999)
      const { data: accrualEntries } = await supabase
        .from('airledger_entries')
        .select('id, airledger_transactions!inner(transaction_date)')
        .or('and(account_code.gte.1700,account_code.lte.1799),and(account_code.gte.2900,account_code.lte.2999)')
        .gte('airledger_transactions.transaction_date', yearStart)
        .lte('airledger_transactions.transaction_date', yearEnd)
        .limit(1);

      const hasAccruals = (accrualEntries?.length || 0) > 0;

      // Check for tax provision (8910)
      const { data: taxEntries } = await supabase
        .from('airledger_entries')
        .select('id, airledger_transactions!inner(transaction_date)')
        .eq('account_code', '8910')
        .gte('airledger_transactions.transaction_date', yearStart)
        .lte('airledger_transactions.transaction_date', yearEnd)
        .limit(1);

      const hasTaxProvision = (taxEntries?.length || 0) > 0;

      const check = (done: boolean) => done ? '✅' : '⬜';

      response += `\n\n📋 **Checklista årsbokslut ${year}**\n\n` +
        `${check(true)} Transaktioner bokförda (${txCount || 0} st)\n` +
        `${check(hasDepreciation)} Avskrivningar\n` +
        `${check(hasAccruals)} Periodiseringar\n` +
        `${check(hasTaxProvision)} Skatteavsättning\n` +
        `⬜ Resultaträkning granskad\n` +
        `⬜ Balansräkning granskad\n` +
        `⬜ Räkenskapsåret låst\n\n` +
        `💡 Vill du att jag visar resultaträkningen för ${year}, eller hjälper med något av stegen ovan?`;
      callResult = { success: true, data: { txCount, hasDepreciation, hasAccruals, hasTaxProvision } };
    } catch (err) {
      console.error('Year-end checklist error:', err);
      response += `\n\n❌ Ett fel uppstod vid hämtning av bokslutsdata.`;
      callResult = { success: false, error: err.message };
    }
  }

  // Markera denna call som genomförd för att förhindra dubbletter
  if (callResult) {
    markCallAsExecuted(functionName, args, callResult, conversationId);
  }

  return response;
}
