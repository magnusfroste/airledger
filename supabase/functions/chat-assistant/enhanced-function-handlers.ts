
import { analyzeTransactionText, TransactionAnalysis } from './transaction-analyzer.ts';
import { validateTransaction, generateValidationMessage } from './validation-framework.ts';
import { FunctionCallArgs } from './types.ts';

export async function handleEnhancedFunctionCall(
  functionName: string,
  args: FunctionCallArgs,
  supabase: any,
  userMessage: string
): Promise<string> {
  let response = '';

  // Analysera användarens meddelande först
  const analysis = analyzeTransactionText(userMessage);
  const validation = validateTransaction(analysis);

  // Generera analysmeddelande
  response += generateValidationMessage(analysis, validation);

  // Om validering misslyckas eller kräver bekräftelse, vänta med att utföra
  if (!validation.isValid) {
    response += `\n\n❌ **Transaktionen kan inte utföras automatiskt**\n\nVänligen korrigera problemen ovan innan vi fortsätter.`;
    return response;
  }

  if (validation.requiresUserConfirmation) {
    response += `\n\n⚠️ **Bekräftelse krävs**\n\nVill du att jag ska fortsätta med denna tolkning? Svara "ja" för att bekräfta eller korrigera informationen.`;
    return response;
  }

  // Om allt är OK, fortsätt med ursprunglig funktionshantering
  response += `\n\n✅ **Analys godkänd - utför transaktion**\n\n`;

  // Anropa ursprunglig funktionshanterare
  const originalResult = await callOriginalFunctionHandler(functionName, args, supabase);
  response += originalResult;

  return response;
}

async function callOriginalFunctionHandler(
  functionName: string,
  args: FunctionCallArgs,
  supabase: any
): Promise<string> {
  // Importera och anropa ursprunglig funktionshanterare
  const { handleFunctionCall } = await import('./function-handlers.ts');
  return await handleFunctionCall(functionName, args, supabase);
}

export function shouldUseEnhancedAnalysis(userMessage: string): boolean {
  // Aktivera förbättrad analys för alla transaktionsrelaterade meddelanden
  const transactionKeywords = [
    'faktura', 'betalat', 'köpt', 'sålt', 'hyra', 'kostnad',
    'intäkt', 'utgift', 'bredband', 'telefon', 'el', 'försäkring'
  ];

  return transactionKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword)
  );
}
