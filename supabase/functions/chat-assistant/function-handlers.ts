
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
      callResult = { success: false, error: (parseError as Error).message };
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
      callResult = { success: false, error: (parseError as Error).message };
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
      callResult = { success: false, error: (parseError as Error).message };
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
      callResult = { success: false, error: (err as Error).message };
    }
  } else if (functionName === 'calculate_account_balance') {
    try {
      console.log('Calculating account balance:', args);
      const accountCode = args.accountCode;
      const periodStart = args.periodStart || `${new Date().getFullYear()}-01-01`;
      const periodEnd = args.periodEnd || new Date().toISOString().split('T')[0];

      // Get opening balance (respect balance_type for credit accounts)
      const { data: opening } = await supabase
        .from('airledger_opening')
        .select('opening_balance, balance_type')
        .eq('account_code', accountCode)
        .single();

      const rawOb = Number(opening?.opening_balance || 0);
      const ib = opening?.balance_type === 'credit' ? -rawOb : rawOb;

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
      callResult = { success: false, error: (err as Error).message };
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

      // Get ALL entries for the year to compute class totals
      const { data: allEntries } = await supabase
        .from('airledger_entries')
        .select('account_code, debit_amount, credit_amount, airledger_transactions!inner(transaction_date)')
        .gte('airledger_transactions.transaction_date', yearStart)
        .lte('airledger_transactions.transaction_date', yearEnd);

      const entries = allEntries || [];

      // Classify entries by account class
      let hasDepreciation = false;
      let hasAccruals = false;
      let hasTaxProvision = false;
      const classTotals: Record<string, { debit: number; credit: number }> = {};

      for (const e of entries) {
        const code = e.account_code;
        const cls = code.charAt(0); // first digit = class
        if (!classTotals[cls]) classTotals[cls] = { debit: 0, credit: 0 };
        classTotals[cls].debit += Number(e.debit_amount) || 0;
        classTotals[cls].credit += Number(e.credit_amount) || 0;

        const codeNum = parseInt(code);
        if (codeNum >= 7800 && codeNum <= 7899) hasDepreciation = true;
        if ((codeNum >= 1700 && codeNum <= 1799) || (codeNum >= 2900 && codeNum <= 2999)) hasAccruals = true;
        if (code === '8910') hasTaxProvision = true;
      }

      // Calculate net result: revenue (class 3 credit-debit) minus costs (class 4-7 debit-credit)
      const revenue = (classTotals['3']?.credit || 0) - (classTotals['3']?.debit || 0);
      const costs = ['4', '5', '6', '7'].reduce((sum, c) => {
        return sum + ((classTotals[c]?.debit || 0) - (classTotals[c]?.credit || 0));
      }, 0);
      // Financial items class 8
      const financial = (classTotals['8']?.credit || 0) - (classTotals['8']?.debit || 0);
      const netResult = revenue - costs + financial;
      const estimatedTax = netResult > 0 ? Math.round(netResult * 0.206) : 0;

      const check = (done: boolean) => done ? '✅' : '⬜';

      response += `\n\n📋 **Checklista årsbokslut ${year}**\n\n` +
        `${check(true)} Transaktioner bokförda (${txCount || 0} st)\n` +
        `${check(hasDepreciation)} Avskrivningar\n` +
        `${check(hasAccruals)} Periodiseringar\n` +
        `${check(hasTaxProvision)} Skatteavsättning\n` +
        `⬜ Resultaträkning granskad\n` +
        `⬜ Balansräkning granskad\n` +
        `⬜ Räkenskapsåret låst\n\n` +
        `---\n\n` +
        `📊 **Beräknat resultat ${year}**\n\n` +
        `| Post | Belopp |\n|------|--------|\n` +
        `| Intäkter (klass 3) | ${revenue.toLocaleString('sv-SE')} kr |\n` +
        `| Kostnader (klass 4–7) | -${costs.toLocaleString('sv-SE')} kr |\n` +
        `| Finansiellt netto (klass 8) | ${financial.toLocaleString('sv-SE')} kr |\n` +
        `| **Resultat före skatt** | **${netResult.toLocaleString('sv-SE')} kr** |\n` +
        (estimatedTax > 0 ? `| Uppskattad skatt (20.6%) | ${estimatedTax.toLocaleString('sv-SE')} kr |\n` : '') +
        `\n💡 Vill du att jag guidar dig genom bokslutet steg för steg?`;

      callResult = {
        success: true,
        data: {
          txCount, hasDepreciation, hasAccruals, hasTaxProvision,
          revenue, costs, financial, netResult, estimatedTax,
          classTotals,
        },
      };
    } catch (err) {
      console.error('Year-end checklist error:', err);
      response += `\n\n❌ Ett fel uppstod vid hämtning av bokslutsdata.`;
      callResult = { success: false, error: (err as Error).message };
    }
  } else if (functionName === 'generate_year_end_summary') {
    try {
      const year = args.fiscalYear;
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      // Get opening balances
      const { data: openings } = await supabase
        .from('airledger_opening')
        .select('account_code, account_name, opening_balance, balance_type');

      // Get all entries for the year
      const { data: allEntries } = await supabase
        .from('airledger_entries')
        .select('account_code, account_name, debit_amount, credit_amount, airledger_transactions!inner(transaction_date)')
        .gte('airledger_transactions.transaction_date', yearStart)
        .lte('airledger_transactions.transaction_date', yearEnd);

      const entries = allEntries || [];
      const obs = openings || [];

      // Build account balances
      const balances: Record<string, { name: string; debit: number; credit: number; ob: number }> = {};

      for (const o of obs) {
        balances[o.account_code] = {
          name: o.account_name,
          debit: 0, credit: 0,
          ob: o.balance_type === 'credit' ? -Number(o.opening_balance) : Number(o.opening_balance),
        };
      }

      for (const e of entries) {
        if (!balances[e.account_code]) {
          balances[e.account_code] = { name: e.account_name, debit: 0, credit: 0, ob: 0 };
        }
        balances[e.account_code].debit += Number(e.debit_amount) || 0;
        balances[e.account_code].credit += Number(e.credit_amount) || 0;
      }

      // Classify into income statement vs balance sheet
      let totalRevenue = 0;
      let totalCosts = 0;
      let totalAssets = 0;
      let totalLiabilitiesEquity = 0;
      const warnings: string[] = [];

      const incomeRows: string[] = [];
      const balanceRows: string[] = [];

      const sorted = Object.entries(balances).sort(([a], [b]) => a.localeCompare(b));

      for (const [code, b] of sorted) {
        const cls = parseInt(code.charAt(0));
        const ub = b.ob + b.debit - b.credit;

        if (cls >= 3 && cls <= 8) {
          // Income statement
          const net = cls === 3 ? (b.credit - b.debit) : (b.debit - b.credit);
          if (Math.abs(net) > 0) {
            incomeRows.push(`| ${code} ${b.name} | ${net.toLocaleString('sv-SE')} kr |`);
          }
          if (cls === 3) totalRevenue += b.credit - b.debit;
          else totalCosts += b.debit - b.credit;
        } else if (cls >= 1 && cls <= 2) {
          // Balance sheet
          if (Math.abs(ub) > 0) {
            balanceRows.push(`| ${code} ${b.name} | ${ub.toLocaleString('sv-SE')} kr |`);
          }
          if (cls === 1) totalAssets += ub;
          else totalLiabilitiesEquity += ub; // liabilities are credit-heavy so ub is negative
        }
      }

      const netResult = totalRevenue - totalCosts;
      const balanceDiff = totalAssets + totalLiabilitiesEquity + netResult; // should be ~0

      if (Math.abs(balanceDiff) > 1) {
        warnings.push(`⚠️ Balansen stämmer inte — differens ${balanceDiff.toLocaleString('sv-SE')} kr`);
      }
      if (totalCosts === 0 && totalRevenue === 0) {
        warnings.push('⚠️ Inga intäkter eller kostnader bokförda');
      }

      response += `\n\n📊 **Bokslutssammanfattning ${year}**\n\n`;

      response += `### Resultaträkning\n\n| Konto | Belopp |\n|-------|--------|\n`;
      response += incomeRows.join('\n') + '\n';
      response += `| **Intäkter totalt** | **${totalRevenue.toLocaleString('sv-SE')} kr** |\n`;
      response += `| **Kostnader totalt** | **-${totalCosts.toLocaleString('sv-SE')} kr** |\n`;
      response += `| **Årets resultat** | **${netResult.toLocaleString('sv-SE')} kr** |\n\n`;

      response += `### Balansräkning\n\n| Konto | Belopp |\n|-------|--------|\n`;
      response += balanceRows.join('\n') + '\n';
      response += `| **Tillgångar totalt** | **${totalAssets.toLocaleString('sv-SE')} kr** |\n`;
      response += `| **Skulder + EK totalt** | **${Math.abs(totalLiabilitiesEquity).toLocaleString('sv-SE')} kr** |\n\n`;

      if (warnings.length > 0) {
        response += warnings.join('\n') + '\n\n';
      }

      response += `🔗 Granska i detalj: [Resultaträkning](/reports) | [Balansräkning](/balance-sheet)`;

      callResult = {
        success: true,
        data: { totalRevenue, totalCosts, netResult, totalAssets, totalLiabilitiesEquity, balanceDiff, warnings },
      };
    } catch (err) {
      console.error('Year-end summary error:', err);
      response += `\n\n❌ Ett fel uppstod vid generering av bokslutssammanfattning.`;
      callResult = { success: false, error: (err as Error).message };
    }
  }

  // Markera denna call som genomförd för att förhindra dubbletter
  if (callResult) {
    markCallAsExecuted(functionName, args, callResult, conversationId);
  }

  return response;
}
