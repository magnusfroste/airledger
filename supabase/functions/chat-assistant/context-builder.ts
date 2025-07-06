import { UserData } from './types.ts';

export function buildBookkeepingContext(userData: UserData): string {
  const { userName, transactions, openingBalances, chartOfAccounts } = userData;

  // Add chart of accounts context
  let chartContext = '';
  if (chartOfAccounts && chartOfAccounts.length > 0) {
    // Group accounts by type for better organization
    const accountsByType = chartOfAccounts.reduce((acc: any, account) => {
      if (!acc[account.account_type]) acc[account.account_type] = [];
      acc[account.account_type].push(account);
      return acc;
    }, {});

    chartContext = `
BAS 2024 KONTOPLAN (urval av vanligaste kontona):

TILLGÅNGAR (Assets - Normal balans: Debet):
${accountsByType.asset?.slice(0, 20).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

SKULDER (Liabilities - Normal balans: Kredit):
${accountsByType.liability?.slice(0, 15).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

EGET KAPITAL (Equity - Normal balans: Kredit):
${accountsByType.equity?.slice(0, 10).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

INTÄKTER (Income - Normal balans: Kredit):
${accountsByType.income?.slice(0, 15).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

KOSTNADER (Expenses - Normal balans: Debet):
${accountsByType.expense?.slice(0, 30).map((a: any) => `- ${a.account_code} ${a.account_name}`).join('\n') || ''}

VIKTIGA KONTON ATT KOMMA IHÅG:
- 1930 Checkkonto (bankkonto)
- 1510 Kundfordringar (när du fakturerat men inte fått betalt)
- 2640 Leverantörsskulder (när du fått faktura men inte betalat)
- 3000 Försäljning (intäkter från försäljning)
- 4000 Inköp av varor (kostnader för varor du säljer)
- 6000 Lokalhyra, 6830 Bankavgifter, 6850 Försäkringar

När användaren nämner kontonummer, använd denna lista för att ge korrekt kontonamn.
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
  
  if (transactions && transactions.length > 0) {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
    const recentTransactions = transactions.slice(0, 5);
    
    return `
BOKFÖRINGSDATA FÖR ${userName.toUpperCase()}:

${chartContext}

${openingBalancesContext}

TRANSAKTIONER:
- Totalt antal transaktioner: ${totalTransactions}
- Total omsättning: ${totalAmount.toFixed(2)} kr

SENASTE TRANSAKTIONER:
${recentTransactions.map(t => `
- ${t.transaction_date}: ${t.description} (${t.total_amount} kr) - Status: ${t.status}
  Konton: ${t.airledger_entries?.map((e: any) => `${e.account_code} ${e.account_name}: ${e.debit_amount > 0 ? `Debet ${e.debit_amount}` : `Kredit ${e.credit_amount}`} kr`).join(', ') || 'Inga poster'}
`).join('')}
`;
  } else {
    return `
BOKFÖRINGSDATA FÖR ${userName.toUpperCase()}:

${chartContext}

${openingBalancesContext}

TRANSAKTIONER:
- Inga transaktioner registrerade än
- Rekommenderar att börja med att ladda upp kvitton för automatisk analys
`;
  }
}