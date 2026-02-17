// Helper utilities for Testbolaget integration tests

/**
 * Parse a booking proposal table from AI markdown response.
 * Looks for lines like: | 5010 | Lokalhyra | 10 000 | |
 * Returns array of { account_code, debit, credit }
 */
export interface ParsedEntry {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export function parseBookingEntries(response: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  // Match markdown table rows: | code | name | debit | credit |
  const lines = response.split('\n');
  for (const line of lines) {
    const match = line.match(
      /\|\s*(\d{4})\s*\|\s*([^|]+)\|\s*([\d\s,.]*)\s*\|\s*([\d\s,.]*)\s*\|/
    );
    if (match) {
      entries.push({
        account_code: match[1].trim(),
        account_name: match[2].trim(),
        debit: parseAmount(match[3]),
        credit: parseAmount(match[4]),
      });
    }
  }
  return entries;
}

/**
 * Parse Swedish formatted amount: "10 000" or "10 000,00" or "10000" -> 10000
 */
export function parseAmount(str: string): number {
  const cleaned = str.replace(/\s/g, '').replace(',', '.').trim();
  if (!cleaned) return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Check if debit sum equals credit sum (balanced entry)
 */
export function isBalanced(entries: ParsedEntry[]): boolean {
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
}

/**
 * Check if response mentions a follow-up template
 */
export function mentionsFollowUp(response: string, followUp: string): boolean {
  return response.toLowerCase().includes(followUp.toLowerCase());
}

/**
 * Check if AI is asking a question (missing info)
 */
export function isAskingQuestion(response: string): boolean {
  const indicators = ['?', 'hur mycket', 'vilket belopp', 'ange', 'behöver veta'];
  return indicators.some(q => response.toLowerCase().includes(q));
}
