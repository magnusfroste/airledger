import { IntentClassification, TemplateMatch } from './types.ts';

export function formatBookingProposal(
  match: TemplateMatch,
  amount: number,
  date: string,
  description?: string
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

  for (const entry of entries) {
    const entryAmount = calculateEntryAmount(entry, amount);
    const debit = entry.type === 'debit' ? formatKr(entryAmount) : '';
    const credit = entry.type === 'credit' ? formatKr(entryAmount) : '';
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

  return baseAmount;
}
