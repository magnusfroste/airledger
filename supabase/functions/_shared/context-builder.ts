import { UserData } from './types.ts';

/**
 * Light mode: Template name + category + description + keywords (~400 tokens).
 * Used for intent classification.
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

  // Vendor patterns — learned from transaction history
  if (userData.vendorPatterns && userData.vendorPatterns.length > 0) {
    context += `\nLEVERANTÖRSMÖNSTER (baserat på historik):\n`;
    userData.vendorPatterns.forEach((vp: any) => {
      context += `- "${vp.vendor}" → mall "${vp.template_name}", snittbelopp ${vp.avg_amount.toLocaleString('sv-SE')} kr (${vp.count} ggr)\n`;
    });
  }

  // Template preferences — most used templates
  if (userData.templatePreferences && userData.templatePreferences.length > 0) {
    context += `\nMALLPREFERENSER (mest använda):\n`;
    userData.templatePreferences.slice(0, 5).forEach((tp: any) => {
      context += `- ${tp.template_name}: ${tp.usage_count} ggr\n`;
    });
  }

  // Include financial snapshot if available
  const snapshot = buildFinancialSnapshot(userData);
  if (snapshot) {
    context += `\n${snapshot}`;
  }

  return context;
}

/**
 * Financial snapshot: current account balances (IB + debit - credit).
 * Injected into AI prompts for context-aware transaction interpretation.
 */
export function buildFinancialSnapshot(userData: UserData): string {
  if (!userData.accountBalances || userData.accountBalances.length === 0) return '';

  // Only include balance-sheet accounts (class 1-2) with activity
  const balanceAccounts = userData.accountBalances.filter(ab => {
    const cls = ab.account_code.charAt(0);
    return cls === '1' || cls === '2';
  });

  if (balanceAccounts.length === 0) return '';

  let snapshot = 'KONTOSALDON (aktuella):\n';
  for (const ab of balanceAccounts) {
    snapshot += `${ab.account_code} ${ab.account_name}: ${ab.balance.toLocaleString('sv-SE')} kr (${ab.normal_balance})\n`;
  }

  return snapshot;
}
