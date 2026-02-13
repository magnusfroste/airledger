import { UserData } from './types.ts';

/**
 * Light mode: Only template names and categories (~100 tokens).
 * Used for intent classification.
 */
export function buildLightContext(userData: UserData): string[] {
  if (!userData.templates || userData.templates.length === 0) return [];
  return userData.templates.map((t: any) => t.template_name);
}

/**
 * Full mode: Complete bookkeeping context (~800 tokens).
 * Used for ask_question / view_report intents.
 */
export function buildBookkeepingContext(userData: UserData): string {
  let context = '';

  if (userData.profile) {
    context += `\nFÖRETAGSINFORMATION:\n`;
    if (userData.profile.full_name) context += `Företag: ${userData.profile.full_name}\n`;
    if (userData.profile.industry) context += `Bransch: ${userData.profile.industry}\n`;
  }

  if (userData.templates && userData.templates.length > 0) {
    context += `\nTILLGÄNGLIGA MALLAR:\n`;
    userData.templates.forEach((template: any) => {
      context += `- ${template.template_name}: ${template.description}\n`;
      if (template.template_entries && Array.isArray(template.template_entries)) {
        template.template_entries.forEach((entry: any) => {
          const type = entry.type === 'debit' ? 'Debet' : 'Kredit';
          context += `  ${type}: ${entry.account_code} ${entry.account_name}`;
          if (entry.vat_calculation) context += ` (${entry.vat_calculation})`;
          context += `\n`;
        });
      }
    });
  }

  if (userData.recentTransactions && userData.recentTransactions.length > 0) {
    context += `\nSENASTE TRANSAKTIONER:\n`;
    userData.recentTransactions.slice(0, 5).forEach((t: any) => {
      context += `- ${t.transaction_date}: ${t.description} (${t.total_amount} kr)\n`;
    });
  }

  if (userData.chartOfAccounts && userData.chartOfAccounts.length > 0) {
    context += `\nBAS-KONTOPLAN (urval):\n`;
    const relevant = userData.chartOfAccounts.filter((a: any) =>
      ['1930', '1510', '2640', '2610', '3000', '4000', '5010', '6410', '6110', '6212', '6970'].includes(a.account_code)
    );
    relevant.forEach((a: any) => context += `${a.account_code} ${a.account_name}\n`);
  }

  if (userData.openingBalances && userData.openingBalances.length > 0) {
    context += `\nINGÅENDE BALANSER:\n`;
    userData.openingBalances.forEach((b: any) => {
      context += `${b.account_code} ${b.account_name}: ${b.opening_balance} kr\n`;
    });
  }

  return context;
}
