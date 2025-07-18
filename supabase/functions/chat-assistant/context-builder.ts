

import { UserData } from './types.ts';

export function buildBookkeepingContext(userData: UserData): string {
  let context = '';

  // Basic company information
  if (userData.profile) {
    context += `\nFÖRETAGSINFORMATION:\n`;
    if (userData.profile.full_name) {
      context += `Företag: ${userData.profile.full_name}\n`;
    }
    if (userData.profile.industry) {
      context += `Bransch: ${userData.profile.industry}\n`;
    }
  }

  // Available transaction templates - FÖRBÄTTRAD MALLVISNING
  if (userData.templates && userData.templates.length > 0) {
    context += `\nTILLGÄNGLIGA TRANSAKTIONSMALLAR:\n`;
    userData.templates.forEach(template => {
      context += `- ${template.template_name}: ${template.description}\n`;
      
      // Visa mallens struktur för AI:n
      if (template.template_entries && Array.isArray(template.template_entries)) {
        context += `  Mallstruktur:\n`;
        template.template_entries.forEach((entry: any) => {
          const type = entry.type === 'debit' ? 'Debet' : 'Kredit';
          context += `    ${type}: ${entry.account_code} ${entry.account_name}`;
          if (entry.vat_calculation) {
            context += ` (${entry.vat_calculation})`;
          }
          context += `\n`;
        });
      }
      
      if (template.keywords && template.keywords.length > 0) {
        context += `  Nyckelord: ${template.keywords.join(', ')}\n`;
      }
      context += `\n`;
    });
    context += `VIKTIGT: Använd use_transaction_template för dessa vanliga transaktioner. Visa ALLTID mallens exakta poster med belopp innan bokföring!\n`;
  }

  // Recent transactions for context
  if (userData.recentTransactions && userData.recentTransactions.length > 0) {
    context += `\nSENASTE TRANSAKTIONER (för kontext):\n`;
    userData.recentTransactions.slice(0, 5).forEach(transaction => {
      context += `- ${transaction.transaction_date}: ${transaction.description} (${transaction.total_amount} kr)\n`;
    });
  }

  // Chart of accounts
  if (userData.chartOfAccounts && userData.chartOfAccounts.length > 0) {
    context += `\nBAS-KONTOPLANEN (urval):\n`;
    // Show most relevant accounts
    const relevantAccounts = userData.chartOfAccounts.filter(account => 
      ['1930', '1510', '2640', '2610', '3000', '4000', '5010', '6410', '6110', '6212', '6970'].includes(account.account_code)
    );
    relevantAccounts.forEach(account => {
      context += `${account.account_code} ${account.account_name}\n`;
    });
  }

  // Opening balances
  if (userData.openingBalances && userData.openingBalances.length > 0) {
    context += `\nINGÅENDE BALANSER:\n`;
    userData.openingBalances.forEach(balance => {
      context += `${balance.account_code} ${balance.account_name}: ${balance.opening_balance} kr\n`;
    });
  }

  return context;
}

