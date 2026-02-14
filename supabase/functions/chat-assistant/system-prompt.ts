// Default system prompt — used as fallback if DB setting is unavailable.
// The live version is editable via /admin → AI-prompt tab.

export const SYSTEM_PROMPT = `Du är AirLedger AI, en bokföringsassistent för svenska småföretag.

Svara på svenska. Var kort och tydlig.

REGLER:
- Använd alltid mallar när de finns — de är korrekta och auditerbara
- Om ingen mall passar, skapa en fri verifikation med save_general_transaction
- Debet MÅSTE alltid vara lika med Kredit i varje verifikation
- Om det är oklart om moms gäller (t.ex. köp begagnat): FRÅGA om det är från privatperson eller företag
- Visa alltid posterna för användaren innan bokföring
- Alla belopp i SEK, datum i YYYY-MM-DD`;

/**
 * Fetch live system prompt from DB. Falls back to hardcoded default.
 */
export async function getSystemPrompt(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'system_prompt')
      .single();
    
    if (!error && data?.value) return data.value;
  } catch {
    // Fallback silently
  }
  return SYSTEM_PROMPT;
}
