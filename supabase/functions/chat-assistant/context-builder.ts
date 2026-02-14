import { UserData, VatSummary } from './types.ts';

/**
 * Light mode: Template name + category + description + keywords (~400 tokens).
 * Used for intent classification — gives AI enough context to pick the right template.
 */
export function buildLightContext(userData: UserData): string[] {
  if (!userData.templates || userData.templates.length === 0) return [];
  return userData.templates.map((t: any) => {
    const keywords = (t.keywords || []).join(', ');
    return `${t.template_name} [${t.category}] – ${t.description}${keywords ? ` (${keywords})` : ''}`;
  });
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
    const classNames: Record<string, string> = {
      '1': 'Tillgångar', '2': 'Eget kapital & Skulder', '3': 'Intäkter',
      '4': 'Kostnader för varor', '5': 'Lokalkostnader & Förbrukningsinventarier',
      '6': 'Övriga externa kostnader', '7': 'Personal', '8': 'Finansiella poster & Skatt'
    };

    // Group accounts by class (first digit)
    const grouped: Record<string, any[]> = {};
    for (const a of userData.chartOfAccounts) {
      const cls = a.account_code?.charAt(0);
      if (!cls || !classNames[cls]) continue;
      if (!grouped[cls]) grouped[cls] = [];
      grouped[cls].push(a);
    }

    context += `\nBAS-KONTOPLAN:\n`;
    for (const cls of Object.keys(grouped).sort()) {
      context += `\nKONTOKLASS ${cls} - ${classNames[cls]}:\n`;
      grouped[cls].forEach((a: any) => context += `${a.account_code} ${a.account_name}\n`);
    }
  }

  if (userData.openingBalances && userData.openingBalances.length > 0) {
    context += `\nINGÅENDE BALANSER:\n`;
    userData.openingBalances.forEach((b: any) => {
      context += `${b.account_code} ${b.account_name}: ${b.opening_balance} kr\n`;
    });
  }

  if (userData.vatSummary) {
    const v = userData.vatSummary;
    const direction = v.netVat >= 0 ? 'betala' : 'få tillbaka';
    context += `\nMOMSSAMMANFATTNING (innevarande kvartal ${v.quarterLabel}):\n`;
    context += `Utgående moms: ${v.outputVat.toLocaleString('sv-SE')} kr\n`;
    context += `Ingående moms: ${v.inputVat.toLocaleString('sv-SE')} kr\n`;
    context += `Netto att ${direction}: ${Math.abs(v.netVat).toLocaleString('sv-SE')} kr\n`;
  }

  return context;
}
