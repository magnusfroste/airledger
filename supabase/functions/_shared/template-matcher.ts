import { IntentClassification, TemplateMatch, BankTransaction } from './types.ts';

// Prisbasbelopp 2026
const PRISBASBELOPP = 57_300;
const HALVA_PRISBASBELOPP = PRISBASBELOPP / 2;

// DB-driven warning rules
interface DbWarningRule {
  id: string;
  rule_name: string;
  template_names: string[];
  threshold_amount: number;
  threshold_direction: string;
  threshold_max: number | null;
  warning_message: string;
  warning_type: string;
  is_active: boolean;
}

async function fetchWarningRules(supabase: any): Promise<DbWarningRule[]> {
  const { data, error } = await supabase
    .from('warning_rules')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch warning rules:', error);
    return [];
  }
  return data || [];
}

function checkDbWarningRule(rule: DbWarningRule, amount: number): string | null {
  let triggered = false;
  switch (rule.threshold_direction) {
    case 'above':
      triggered = amount > rule.threshold_amount;
      break;
    case 'below':
      triggered = amount < rule.threshold_amount;
      break;
    case 'between':
      triggered = amount > rule.threshold_amount && (rule.threshold_max ? amount <= rule.threshold_max : true);
      break;
  }
  if (!triggered) return null;
  return rule.warning_message.replace(/\{threshold\}/g, rule.threshold_amount.toLocaleString('sv-SE'));
}

// Amount-based template overrides
const AMOUNT_OVERRIDES: Array<{
  fromTemplates: string[];
  toTemplate: string;
  threshold: number;
  direction: 'above' | 'below';
}> = [
  {
    fromTemplates: ['Förbrukningsinventarie'],
    toTemplate: 'Inköp dator/laptop',
    threshold: HALVA_PRISBASBELOPP,
    direction: 'above',
  },
  {
    fromTemplates: ['Inköp dator/laptop', 'Inköp möbler'],
    toTemplate: 'Förbrukningsinventarie',
    threshold: HALVA_PRISBASBELOPP,
    direction: 'below',
  },
];

const INTENT_TO_CATEGORY: Record<string, string[]> = {
  book_expense: ['kostnad', 'expense', 'inköp', 'skuld'],
  book_sale: ['intäkt', 'försäljning', 'revenue', 'fakturering'],
  book_payment: ['betalning', 'payment', 'kundbetalning'],
};

/**
 * Match intent against template library (used by chat-assistant).
 */
export interface MatchTemplateResult {
  match: TemplateMatch | null;
  candidates: TemplateMatch[];
}

export async function matchTemplate(
  intent: IntentClassification,
  supabase: any,
  userId: string
): Promise<TemplateMatch | null> {
  const result = await matchTemplateWithCandidates(intent, supabase, userId);
  return result.match;
}

export async function matchTemplateWithCandidates(
  intent: IntentClassification,
  supabase: any,
  userId: string
): Promise<MatchTemplateResult> {
  const { data: templates, error } = await supabase
    .from('airledger_transaction_templates')
    .select('*')
    .or(`is_system_template.eq.true,user_id.eq.${userId}`)
    .eq('auto_suggest', true)
    .order('usage_count', { ascending: false });

  if (error || !templates?.length) {
    console.error('Template fetch error:', error);
    return { match: null, candidates: [] };
  }

  let match: TemplateMatch | null = null;

  // 1. Exact match on template hint
  if (intent.matched_template_hint) {
    const hint = intent.matched_template_hint.toLowerCase();
    const exact = templates.find((t: any) => t.template_name.toLowerCase() === hint);
    if (exact) {
      match = { template: exact, match_type: 'exact', confidence: 0.95 };
    }
    if (!match) {
      const partial = templates.find((t: any) =>
        t.template_name.toLowerCase().includes(hint) || hint.includes(t.template_name.toLowerCase())
      );
      if (partial) match = { template: partial, match_type: 'exact', confidence: 0.85 };
    }
  }

  // 2. Category match
  if (!match) {
    const categories = INTENT_TO_CATEGORY[intent.intent] || [];
    if (categories.length > 0) {
      const categoryMatch = templates.find((t: any) =>
        categories.some(cat => t.category.toLowerCase().includes(cat) || t.description.toLowerCase().includes(cat))
      );
      if (categoryMatch) match = { template: categoryMatch, match_type: 'category', confidence: 0.7 };
    }
  }

  // 3. Keyword match from extracted data
  if (!match) {
    match = keywordMatch(templates, [
      intent.extracted_data.description,
      intent.extracted_data.vendor,
    ].filter(Boolean) as string[]);
  }

  // 4. Apply overrides + warnings
  if (match) {
    match = applyAmountOverride(match, intent.extracted_data.amount, templates);
    match = await applyWarningsFromDb(match, intent.extracted_data.amount, supabase);
  }

  // 5. Collect runner-up candidates for disambiguation
  const candidates = collectCandidates(templates, intent, match);

  return { match, candidates };
}

function collectCandidates(
  templates: any[],
  intent: IntentClassification,
  primaryMatch: TemplateMatch | null
): TemplateMatch[] {
  const searchTerms = [
    intent.extracted_data.description,
    intent.extracted_data.vendor,
  ].filter(Boolean) as string[];

  const lower = searchTerms.map(s => s.toLowerCase());
  const categories = INTENT_TO_CATEGORY[intent.intent] || [];
  const primaryName = primaryMatch?.template?.template_name;

  const scored: Array<{ template: any; score: number }> = [];

  for (const t of templates) {
    if (t.template_name === primaryName) continue;

    let score = 0;
    const keywords: string[] = t.keywords || [];
    const allTerms = [
      ...keywords.map((k: string) => k.toLowerCase()),
      t.template_name.toLowerCase(),
      t.description.toLowerCase(),
    ];

    for (const term of lower) {
      for (const kw of allTerms) {
        if (kw.includes(term) || term.includes(kw)) score += 2;
      }
    }

    if (categories.some(cat => t.category.toLowerCase().includes(cat))) score += 3;

    // Recency bonus: templates used in the last 30 days get a small boost
    score += recencyBonus(t.last_used_at);

    if (score > 0) scored.push({ template: t, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(s => ({
    template: s.template,
    match_type: 'keyword' as const,
    confidence: Math.min(0.5 + s.score * 0.05, 0.75),
  }));
}

/**
 * Match a single bank statement transaction against the template library.
 * Used by analyze-bank-statement for per-row matching.
 */
export function matchSingleTransaction(
  tx: BankTransaction,
  templates: any[]
): { template: any; entries: any[] } | null {
  const desc = (tx.description || '').toLowerCase();

  let bestMatch: any = null;
  let bestScore = 0;

  for (const tpl of templates) {
    const keywords = (tpl.keywords || []).map((k: string) => k.toLowerCase());
    const tplName = tpl.template_name.toLowerCase();
    let score = 0;

    // Keyword matching (highest weight)
    for (const kw of keywords) {
      if (desc.includes(kw)) score += 3;
    }

    // Template name word matching
    for (const word of tplName.split(/\s+/)) {
      if (word.length > 2 && desc.includes(word)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = tpl;
    }
  }

  if (!bestMatch || bestScore < 2) return null;

  return { template: bestMatch, entries: bestMatch.template_entries || [] };
}

/**
 * Apply matched template's account codes and VAT rules to a bank transaction.
 */
export function applyTemplateToTransaction(tx: BankTransaction, template: any): void {
  const entries = template.template_entries;
  if (!entries || entries.length === 0) return;

  // Check if template has VAT entry (26xx)
  const hasVat = entries.some((e: any) => {
    const code = e.account_code || '';
    return code.startsWith('264') || code.startsWith('261') || code.startsWith('262') || code.startsWith('263');
  });

  tx.vat_applicable = hasVat;
  if (!hasVat) tx.vat_rate = 0;

  // Find primary entry (not bank 1930, not VAT 26xx)
  const primaryEntry = entries.find((e: any) => {
    const code = e.account_code || '';
    return !code.startsWith('193') && !code.startsWith('264') && !code.startsWith('261') && !code.startsWith('262') && !code.startsWith('263');
  });

  if (primaryEntry) {
    tx.suggested_account_code = primaryEntry.account_code;
    tx.suggested_account_name = primaryEntry.account_name;
  }

  // Find bank entry
  const bankEntry = entries.find((e: any) => (e.account_code || '').startsWith('193'));
  if (bankEntry) {
    tx.counterpart_account_code = bankEntry.account_code;
    tx.counterpart_account_name = bankEntry.account_name;
  }
}

// --- Internal helpers ---

function keywordMatch(templates: any[], searchTerms: string[]): TemplateMatch | null {
  if (searchTerms.length === 0) return null;
  const lower = searchTerms.map(s => s.toLowerCase());

  let bestCandidate: any = null;
  let bestScore = 0;

  for (const template of templates) {
    const keywords: string[] = template.keywords || [];
    const allTerms = [
      ...keywords.map((k: string) => k.toLowerCase()),
      template.template_name.toLowerCase(),
      template.description.toLowerCase(),
    ];

    let score = 0;
    for (const term of lower) {
      for (const kwrd of allTerms) {
        if (kwrd.includes(term) || term.includes(kwrd)) score++;
      }
    }

    // Recency bonus
    score += recencyBonus(template.last_used_at);

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = template;
    }
  }

  if (bestCandidate && bestScore > 0) {
    return {
      template: bestCandidate,
      match_type: 'keyword',
      confidence: Math.min(0.6 + bestScore * 0.1, 0.85),
    };
  }
  return null;
}

/**
 * Recency bonus: templates used recently get a small score boost.
 * Last 7 days → +2, last 30 days → +1, older → 0.
 */
function recencyBonus(lastUsedAt: string | null | undefined): number {
  if (!lastUsedAt) return 0;
  const daysAgo = (Date.now() - new Date(lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 7) return 2;
  if (daysAgo <= 30) return 1;
  return 0;
}

function applyAmountOverride(match: TemplateMatch, amount: number | undefined | null, allTemplates: any[]): TemplateMatch {
  if (!amount || amount <= 0) return match;
  const matchedName = match.template.template_name;

  for (const rule of AMOUNT_OVERRIDES) {
    if (!rule.fromTemplates.includes(matchedName)) continue;
    const shouldOverride = rule.direction === 'above' ? amount > rule.threshold : amount < rule.threshold;
    if (shouldOverride) {
      const replacement = allTemplates.find((t: any) => t.template_name === rule.toTemplate);
      if (replacement) {
        console.log(`Amount override: ${matchedName} → ${rule.toTemplate} (${amount} kr, threshold ${rule.threshold})`);
        return { template: replacement, match_type: match.match_type, confidence: match.confidence };
      }
    }
  }
  return match;
}

async function applyWarningsFromDb(match: TemplateMatch, amount: number | undefined | null, supabase: any): Promise<TemplateMatch> {
  if (!amount || amount <= 0) return match;
  const dbRules = await fetchWarningRules(supabase);
  const warnings: string[] = [];
  const matchedName = match.template.template_name;

  for (const rule of dbRules) {
    if (!rule.template_names.includes(matchedName)) continue;
    const warning = checkDbWarningRule(rule, amount);
    if (warning) warnings.push(warning);
  }

  if (warnings.length > 0) return { ...match, warnings };
  return match;
}

export function getTopTemplateCandidates(templates: any[], intent: IntentClassification, limit: number = 3): any[] {
  const categories = INTENT_TO_CATEGORY[intent.intent] || [];
  const scored = templates.map(t => {
    let score = t.usage_count || 0;
    if (categories.some(cat => t.category.toLowerCase().includes(cat))) score += 1000;
    return { ...t, _score: score };
  });
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, limit);
}
