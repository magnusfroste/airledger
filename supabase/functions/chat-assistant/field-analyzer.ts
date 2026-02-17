import { ConversationMessage, RequiredField, FieldAnalysisResult } from './types.ts';

/**
 * Analyze a template's required_fields against extracted data and conversation history.
 * Returns whether all fields are collected, or the next question to ask.
 */
export function analyzeRequiredFields(
  requiredFields: RequiredField[] | null | undefined,
  extractedData: Record<string, any>,
  conversationHistory: ConversationMessage[] | undefined,
  templateName: string,
  currentMessage?: string
): FieldAnalysisResult {
  // No required_fields → fall back to legacy single-amount behavior
  if (!requiredFields || requiredFields.length === 0) {
    if (extractedData.amount) {
      return { complete: true, fieldValues: { amount: extractedData.amount } };
    }
    return {
      complete: false,
      fieldValues: {},
      nextQuestion: `Vilket belopp ska bokföras?`,
      nextFieldKey: 'amount',
      templateName,
    };
  }

  // Collect values from extracted_data + conversation history
  const fieldValues: Record<string, number | string> = {};

  // Standard fields that may already be extracted
  if (extractedData.date) fieldValues['date'] = extractedData.date;
  if (extractedData.description) fieldValues['description'] = extractedData.description;

  // Parse conversation history for previously answered field questions
  if (conversationHistory?.length) {
    for (let i = 0; i < conversationHistory.length; i++) {
      const msg = conversationHistory[i];
      if (msg.sender !== 'ai') continue;

      // Look for field markers: <!-- field:KEY template:NAME -->
      const markerMatch = msg.content.match(/<!-- field:(\w+) template:(.+?) -->/);
      if (!markerMatch) continue;

      const fieldKey = markerMatch[1];
      const markerTemplate = markerMatch[2];
      if (markerTemplate !== templateName) continue;

      // The next user message is the answer (either in history or currentMessage)
      const nextMsg = conversationHistory[i + 1];
      if (nextMsg?.sender === 'user') {
        const parsed = parseAmountFromText(nextMsg.content);
        if (parsed !== null) {
          fieldValues[fieldKey] = parsed;
        } else {
          fieldValues[fieldKey] = nextMsg.content.trim();
        }
      } else if (!nextMsg && currentMessage) {
        // Last AI message in history — currentMessage is the answer
        const parsed = parseAmountFromText(currentMessage);
        if (parsed !== null) {
          fieldValues[fieldKey] = parsed;
        } else {
          fieldValues[fieldKey] = currentMessage.trim();
        }
      }
    }
  }

  // Also check if the current extracted_data.amount maps to the first required amount field
  if (extractedData.amount) {
    const firstAmountField = requiredFields.find(f => f.type === 'amount');
    if (firstAmountField && !(firstAmountField.key in fieldValues)) {
      fieldValues[firstAmountField.key] = extractedData.amount;
    }
  }

  // Check which fields are still missing (skip calc-only fields — they're auto-computed)
  for (const field of requiredFields) {
    if (field.calc) continue; // Auto-calculated, not user-provided
    if (!(field.key in fieldValues)) {
      return {
        complete: false,
        fieldValues,
        nextQuestion: `${field.prompt}\n<!-- field:${field.key} template:${templateName} -->`,
        nextFieldKey: field.key,
        templateName,
      };
    }
  }

  return { complete: true, fieldValues, templateName };
}

/**
 * Calculate amounts for each template entry using collected field values.
 * Returns an array of calculated amounts (one per entry).
 */
export function calculateTemplateAmounts(
  templateEntries: any[],
  requiredFields: RequiredField[] | null | undefined,
  fieldValues: Record<string, number | string>
): number[] {
  // No required_fields → legacy: all entries get the same amount
  if (!requiredFields || requiredFields.length === 0) {
    const amount = typeof fieldValues.amount === 'number' ? fieldValues.amount : 0;
    return templateEntries.map(entry => {
      return calculateLegacyEntryAmount(entry, amount);
    });
  }

  // Build a map: entry index → amount from mapped field
  const amounts: number[] = [];

  for (let i = 0; i < templateEntries.length; i++) {
    const entry = templateEntries[i];

    // Check if a required field maps to this entry
    const mappedField = requiredFields.find(f => f.maps_to_entry === i);

    if (mappedField) {
      const val = fieldValues[mappedField.key];
      amounts.push(typeof val === 'number' ? val : parseFloat(String(val)) || 0);
    } else {
      // Check if this entry has a calc expression
      const calcField = requiredFields.find(f => f.calc && !f.maps_to_entry && f.maps_to_entry !== 0);
      // Also check entry-level calc hints
      const entryCalc = entry.calc;

      const calcExpr = entryCalc || findCalcForEntry(i, requiredFields, templateEntries);

      if (calcExpr) {
        amounts.push(evaluateCalc(calcExpr, fieldValues));
      } else {
        // Fallback: use first amount field value
        const firstAmountField = requiredFields.find(f => f.type === 'amount');
        const fallbackAmount = firstAmountField ? (fieldValues[firstAmountField.key] as number || 0) : 0;
        amounts.push(calculateLegacyEntryAmount(entry, fallbackAmount));
      }
    }
  }

  return amounts;
}

/**
 * Find a calc expression for a given entry index.
 * Looks for required_fields with calc that don't have maps_to_entry set,
 * and matches them to unmapped entries.
 */
function findCalcForEntry(
  entryIndex: number,
  requiredFields: RequiredField[],
  templateEntries: any[]
): string | null {
  // Find entries that are not mapped by any field
  const mappedIndices = new Set(
    requiredFields.filter(f => f.maps_to_entry !== undefined).map(f => f.maps_to_entry)
  );

  if (mappedIndices.has(entryIndex)) return null;

  // Find calc fields that don't have maps_to_entry
  const calcFields = requiredFields.filter(f => f.calc && f.maps_to_entry === undefined);

  // If there's exactly one unmapped entry and one calc field, match them
  const unmappedEntries = templateEntries
    .map((_, idx) => idx)
    .filter(idx => !mappedIndices.has(idx));

  if (calcFields.length === 1 && unmappedEntries.length === 1 && unmappedEntries[0] === entryIndex) {
    return calcFields[0].calc!;
  }

  // Check if the entry itself has a calc property
  const entry = templateEntries[entryIndex];
  if (entry?.calc) return entry.calc;

  return null;
}

/**
 * Evaluate a simple arithmetic expression with variable substitution.
 * Supports: +, -, *, / and abs()
 * Example: "acquisition_value - selling_price"
 */
function evaluateCalc(expression: string, fieldValues: Record<string, number | string>): number {
  let expr = expression;

  // Replace variable names with their values
  for (const [key, val] of Object.entries(fieldValues)) {
    const numVal = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(numVal));
  }

  // Handle abs()
  expr = expr.replace(/abs\(([^)]+)\)/g, (_, inner) => {
    try {
      return String(Math.abs(simpleEval(inner)));
    } catch {
      return '0';
    }
  });

  try {
    return Math.round(simpleEval(expr) * 100) / 100;
  } catch {
    console.error('Failed to evaluate calc expression:', expression, expr);
    return 0;
  }
}

/**
 * Simple safe arithmetic evaluator (no eval()).
 * Handles +, -, *, / with proper operator precedence.
 */
function simpleEval(expr: string): number {
  expr = expr.trim();

  // Tokenize: numbers (including negative) and operators
  const tokens: (number | string)[] = [];
  let i = 0;

  while (i < expr.length) {
    if (expr[i] === ' ') { i++; continue; }

    if ('+-*/'.includes(expr[i]) && tokens.length > 0 && typeof tokens[tokens.length - 1] === 'number') {
      tokens.push(expr[i]);
      i++;
    } else {
      // Parse number
      let numStr = '';
      if (expr[i] === '-' || expr[i] === '+') { numStr += expr[i]; i++; }
      while (i < expr.length && (expr[i] >= '0' && expr[i] <= '9' || expr[i] === '.')) {
        numStr += expr[i];
        i++;
      }
      if (numStr) tokens.push(parseFloat(numStr));
    }
  }

  // Evaluate: first * and /, then + and -
  // Handle * and /
  for (let t = 1; t < tokens.length - 1; t += 2) {
    if (tokens[t] === '*' || tokens[t] === '/') {
      const left = tokens[t - 1] as number;
      const right = tokens[t + 1] as number;
      const result = tokens[t] === '*' ? left * right : left / right;
      tokens.splice(t - 1, 3, result);
      t -= 2;
    }
  }

  // Handle + and -
  let result = tokens[0] as number;
  for (let t = 1; t < tokens.length - 1; t += 2) {
    const right = tokens[t + 1] as number;
    if (tokens[t] === '+') result += right;
    else if (tokens[t] === '-') result -= right;
  }

  return result;
}

function parseAmountFromText(text: string): number | null {
  // Match patterns like "14700", "14 700 kr", "14700.50"
  const cleaned = text.replace(/\s/g, '').replace(/kr$/i, '').replace(/SEK$/i, '').trim();
  const match = cleaned.match(/^-?[\d]+([.,]\d+)?$/);
  if (match) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  return null;
}

function calculateLegacyEntryAmount(entry: any, baseAmount: number): number {
  if (entry.vat_calculation) {
    const vatMatch = entry.vat_calculation.match(/(\d+)/);
    if (vatMatch) {
      const vatRate = parseInt(vatMatch[1]) / 100;
      return Math.round(baseAmount * vatRate * 100) / 100;
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
