import { IntentClassification, TemplateMatch } from './types.ts';

export function formatBookingProposal(
  match: TemplateMatch,
  amount: number,
  date: string,
  description?: string,
  calculatedAmounts?: number[]
): string {
  const template = match.template;
  const entries = template.template_entries || [];

  let response = `📋 **Bokföringsförslag**\n\n`;
  response += `Jag tolkar det som **${template.template_name}**`;
  if (match.confidence < 0.8) {
    response += ` (${Math.round(match.confidence * 100)}% säkerhet)`;
  }
  response += `.\n\n`;

  // Build entry table
  response += `| Konto | Debet | Kredit |\n`;
  response += `|-------|-------|--------|\n`;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const entryAmount = calculatedAmounts ? calculatedAmounts[i] : calculateEntryAmount(entry, amount);
    const isDebit = entry.type === 'debit' || (entry.debit_amount && !entry.credit_amount);
    const isCredit = entry.type === 'credit' || (entry.credit_amount && !entry.debit_amount);
    const debit = isDebit ? formatKr(entryAmount) : '';
    const credit = isCredit ? formatKr(entryAmount) : '';
    response += `| ${entry.account_code} ${entry.account_name} | ${debit} | ${credit} |\n`;
  }

  response += `\n**Datum:** ${date}\n`;
  if (description) {
    response += `**Beskrivning:** ${description}\n`;
  }

  // Show warnings if any
  if (match.warnings?.length) {
    response += `\n`;
    for (const warning of match.warnings) {
      response += `${warning}\n`;
    }
    response += `\n`;
  }

  response += `\nSka jag bokföra detta?`;

  return response;
}

export function formatConfirmation(
  templateName: string,
  amount: number,
  date: string,
  entries: any[]
): string {
  let response = `✅ **Transaktion bokförd!**\n\n`;
  response += `**Mall:** ${templateName}\n`;
  response += `**Belopp:** ${formatKr(amount)}\n`;
  response += `**Datum:** ${date}\n\n`;
  response += `**Bokföringsposter:**\n`;

  for (const entry of entries) {
    const type = entry.debit_amount > 0 ? 'Debet' : 'Kredit';
    const amt = entry.debit_amount > 0 ? entry.debit_amount : entry.credit_amount;
    response += `• ${entry.account_code} ${entry.account_name}: ${type} ${formatKr(amt)}\n`;
  }

  return response;
}

export function formatFollowUpSuggestion(
  followUpTemplate: any,
  accountBalances?: Array<{ account_code: string; account_name: string; balance: number }>
): string {
  let response = `\n---\n\n💡 **Uppföljning: ${followUpTemplate.template_name}**\n`;
  response += `${followUpTemplate.description}\n\n`;

  // Show relevant account balances
  if (accountBalances?.length && followUpTemplate.template_entries) {
    const relevantCodes = new Set<string>();
    for (const entry of followUpTemplate.template_entries) {
      if (entry.account_code) relevantCodes.add(entry.account_code);
    }

    const relevant = accountBalances.filter(ab => relevantCodes.has(ab.account_code));
    if (relevant.length > 0) {
      response += `**Aktuella saldon:**\n`;
      for (const ab of relevant) {
        response += `• ${ab.account_code} ${ab.account_name}: ${ab.balance.toLocaleString('sv-SE')} kr\n`;
      }
      response += `\n`;
    }
  }

  // Show what the template would book
  if (followUpTemplate.template_entries) {
    response += `| Konto | Debet | Kredit |\n`;
    response += `|-------|-------|--------|\n`;
    for (const entry of followUpTemplate.template_entries) {
      const debit = entry.type === 'debit' ? '✓' : '';
      const credit = entry.type === 'credit' ? '✓' : '';
      response += `| ${entry.account_code} ${entry.account_name} | ${debit} | ${credit} |\n`;
    }
    response += `\n`;
  }

  response += `Vill du bokföra detta? Ange beloppet så skapar jag förslaget.`;
  return response;
}

export function formatClarificationRequest(question: string): string {
  return `❓ ${question}`;
}

export function formatTemplateChoices(candidates: any[]): string {
  let response = `🔍 Jag hittade flera möjliga mallar. Vilken stämmer bäst?\n\n`;

  candidates.forEach((t, i) => {
    response += `**${i + 1}. ${t.template_name}**\n`;
    response += `   ${t.description}\n\n`;
  });

  response += `Svara med mallnamnet eller numret.`;
  return response;
}

export function formatBatchProposal(rows: any[]): string {
  let response = `📊 **Bankutdrag - ${rows.length} transaktioner**\n\n`;
  response += `| # | Datum | Beskrivning | Belopp | Mall |\n`;
  response += `|---|-------|-------------|--------|------|\n`;

  rows.forEach((row, i) => {
    const mallName = row.matched_template || '⚠️ Okänd';
    response += `| ${i + 1} | ${row.date} | ${row.description} | ${formatKr(row.amount)} | ${mallName} |\n`;
  });

  response += `\nGranska och bekräfta för att bokföra alla.`;
  return response;
}

export function formatMissingDataPrompt(transactionType: string): string {
  const typeLabel = transactionType === 'book_sale' ? 'intäkt' : 
                    transactionType === 'book_payment' ? 'betalning' : 'utgift';
  return `Självklart! Jag hjälper dig bokföra en ${typeLabel}. Du kan:\n\n` +
    `- **Beskriv transaktionen** — t.ex. "Köpt kontorsmaterial för 500 kr"\n` +
    `- **Bifoga ett kvitto eller faktura** — så analyserar jag det automatiskt\n\n` +
    `Vad vill du bokföra?`;
}

// Helpers

function formatKr(amount: number): string {
  return `${amount.toLocaleString('sv-SE')} kr`;
}

function calculateEntryAmount(entry: any, baseAmount: number): number {
  if (entry.vat_calculation) {
    const vatMatch = entry.vat_calculation.match(/(\d+)/);
    if (vatMatch) {
      const vatRate = parseInt(vatMatch[1]) / 100;
      if (entry.vat_calculation.includes('moms') || entry.vat_calculation.includes('vat')) {
        return Math.round(baseAmount * vatRate * 100) / 100;
      }
    }
  }

  if (entry.amount_type === 'vat') {
    const vatRate = entry.vat_rate || 0.25;
    return Math.round(baseAmount * vatRate * 100) / 100;
  }

  if (entry.amount_type === 'total_with_vat') {
    const vatRate = entry.vat_rate || 0.25;
    return Math.round(baseAmount * (1 + vatRate) * 100) / 100;
  }

  // Use template entry ratios as multipliers (e.g. 0.8 = 80%, 1.0 = 100%)
  const debitRatio = parseFloat(entry.debit_amount) || 0;
  const creditRatio = parseFloat(entry.credit_amount) || 0;
  const ratio = debitRatio > 0 ? debitRatio : creditRatio;

  if (ratio > 0 && ratio !== 1) {
    return Math.round(baseAmount * ratio * 100) / 100;
  }

  return baseAmount;
}
