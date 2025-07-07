import { UserData } from './types.ts';

export function buildBookkeepingContext(userData: UserData): string {
  const { userName, transactions, openingBalances, chartOfAccounts, templates } = userData;

  // Add chart of accounts context with detailed information
  let chartContext = '';
  if (chartOfAccounts && chartOfAccounts.length > 0) {
    // Group accounts by type for better organization
    const accountsByType = chartOfAccounts.reduce((acc: any, account) => {
      if (!acc[account.account_type]) acc[account.account_type] = [];
      acc[account.account_type].push(account);
      return acc;
    }, {});

    chartContext = `
BAS 2024 KONTOPLAN (detaljerad information för AI-assistent):

TILLGÅNGAR (Assets - Normal balans: DEBET):
Ökningar: Debet (+) | Minskningar: Kredit (-)
${accountsByType.asset?.slice(0, 25).map((a: any) => `- ${a.account_code} ${a.account_name} (${a.account_category || 'allmän'})`).join('\n') || ''}

SKULDER (Liabilities - Normal balans: KREDIT):
Ökningar: Kredit (+) | Minskningar: Debet (-)
${accountsByType.liability?.slice(0, 20).map((a: any) => `- ${a.account_code} ${a.account_name} (${a.account_category || 'allmän'})`).join('\n') || ''}

EGET KAPITAL (Equity - Normal balans: KREDIT):
Ökningar: Kredit (+) | Minskningar: Debet (-)
${accountsByType.equity?.slice(0, 15).map((a: any) => `- ${a.account_code} ${a.account_name} (${a.account_category || 'allmän'})`).join('\n') || ''}

INTÄKTER (Income - Normal balans: KREDIT):
Ökningar: Kredit (+) | Minskningar: Debet (-)
${accountsByType.income?.slice(0, 20).map((a: any) => `- ${a.account_code} ${a.account_name} (${a.account_category || 'allmän'})`).join('\n') || ''}

KOSTNADER (Expenses - Normal balans: DEBET):
Ökningar: Debet (+) | Minskningar: Kredit (-)
${accountsByType.expense?.slice(0, 40).map((a: any) => `- ${a.account_code} ${a.account_name} (${a.account_category || 'allmän'})`).join('\n') || ''}

VANLIGASTE KONTON FÖR AI TOOL-VAL:
- 1930 Checkkonto (bankkonto) - alla kontanta transaktioner
- 1510 Kundfordringar - fakturering och kundbetalningar  
- 2640 Leverantörsskulder - leverantörsfakturor och betalningar
- 3000 Försäljning - alla försäljningsintäkter
- 4000 Inköp av varor - varor för återförsäljning
- 6000 Lokalhyra - hyra för lokaler
- 6830 Bankavgifter - bankavgifter och banktjänster
- 6850 Försäkringar - företagsförsäkringar
- 6570 Kontorsmaterial - kontorsutrustning och material
- 5410 Datakostnader - programlicenser och IT-tjänster
- 7210 Löner - löneutbetalningar
- 2510 Skulder skatter och avgifter - preliminärskatt mm

TOOL-VAL BASERAT PÅ KONTONAMN:
- När användaren nämner bankkonto/checkkonto → 1930
- När användaren säger "fakturerat" → 1510 Kundfordringar (save_invoice)
- När användaren säger "fått betalning" → 1930 & 1510 (save_payment)
- När användaren nämner leverantör → 2640 Leverantörsskulder
- När användaren nämner hyra → 6000 (use_transaction_template "Lokalhyra")
- När användaren nämner bankavgift → 6830 (use_transaction_template "Bankavgifter")

KONTOTYP REFERENS FÖR KORREKT DEBET/KREDIT:
- Tillgångar (1xxx): Debet = ökning, Kredit = minskning
- Skulder (2xxx): Kredit = ökning, Debet = minskning  
- Intäkter (3xxx): Kredit = ökning, Debet = minskning
- Kostnader (4xxx, 6xxx, 7xxx): Debet = ökning, Kredit = minskning
`;
  } else {
    chartContext = `
BAS 2024 KONTOPLAN:
- Kontoplanen är inte tillgänglig för tillfället
- Uppmuntra användaren att använda standardkonton som 1930 (Checkkonto)
`;
  }
  
  // Add opening balances context
  let openingBalancesContext = '';
  if (openingBalances && openingBalances.length > 0) {
    openingBalancesContext = `
INGÅENDE BALANSER:
${openingBalances.map(ob => `
- ${ob.account_code} ${ob.account_name}: ${ob.opening_balance} kr (${ob.balance_type === 'debit' ? 'Debet' : 'Kredit'})
`).join('')}
`;
  } else {
    openingBalancesContext = `
INGÅENDE BALANSER:
- Inga ingående balanser registrerade än
- Hjälp användaren att registrera ingående balanser genom att tala in dem
`;
  }
  
  // Add templates context
  let templatesContext = '';
  if (templates && templates.length > 0) {
    templatesContext = `
TILLGÄNGLIGA TRANSAKTIONSMALLAR:
${templates.map(template => `
- ${template.template_name}: ${template.description}
  Kategori: ${template.category}${template.is_recurring ? ' (återkommande ' + template.recurring_frequency + ')' : ''}
`).join('')}

Dessa mallar kan användas för vanliga transaktioner istället för manuell bokföring.
`;
  } else {
    templatesContext = `
TRANSAKTIONSMALLAR:
- Inga anpassade mallar finns än
- Systemet har inbyggda mallar för vanliga transaktioner som preliminärskatt, lön, hyra etc.
`;
  }
  
  if (transactions && transactions.length > 0) {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
    const recentTransactions = transactions.slice(0, 5);
    
    return `
BOKFÖRINGSDATA FÖR ${userName.toUpperCase()}:

${chartContext}

${openingBalancesContext}

${templatesContext}

TRANSAKTIONER:
- Totalt antal transaktioner: ${totalTransactions}
- Total omsättning: ${totalAmount.toFixed(2)} kr

SENASTE TRANSAKTIONER:
${recentTransactions.map(t => `
  `).join('')}
`;
  } else {
    return `
BOKFÖRINGSDATA FÖR ${userName.toUpperCase()}:

${chartContext}

${openingBalancesContext}

${templatesContext}

TRANSAKTIONER:
- Inga transaktioner registrerade än
- Rekommenderar att börja med att ladda upp kvitton för automatisk analys
`;
  }
}