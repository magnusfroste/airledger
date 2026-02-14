import { IntentClassification, TemplateMatch } from './types.ts';

// Prisbasbelopp 2026 — uppdatera årligen
const PRISBASBELOPP = 57_300;
const HALVA_PRISBASBELOPP = PRISBASBELOPP / 2; // 28 650 kr

// Beloppsgränser för varningar (Skatteverket 2026)
const LIMITS = {
  REPRESENTATION_MOMS_PER_PERSON: 300,   // Momsavdrag max 300 kr/person exkl moms
  FRISKVARD_MAX: 5_000,                   // Friskvårdsbidrag skattefritt max
  GAVA_PERSONAL_MAX: 500,                 // Julgåva/jubileumsgåva max per tillfälle
  FORBRUKNINGSINVENTARIE_MAX: HALVA_PRISBASBELOPP,
  TRAKTAMENTE_INRIKES_HELDAG: 290,        // Heldagstraktamente inrikes 2026
  TRAKTAMENTE_INRIKES_HALVDAG: 145,       // Halvdagstraktamente inrikes 2026
  MILERSATTNING_SKATTEFRI: 27,            // Max skattefri milersättning kr/mil 2026
  GAVA_KUND_MAX: 300,                     // Representationsgåva max exkl moms
};

// DB-driven warning rules replace hardcoded WARNING_RULES
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

// Templates that should be overridden based on amount thresholds
const AMOUNT_OVERRIDES: Array<{
  fromTemplates: string[];       // template names that trigger the rule
  toTemplate: string;            // template to switch to when amount exceeds threshold
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

export async function matchTemplate(
  intent: IntentClassification,
  supabase: any,
  userId: string
): Promise<TemplateMatch | null> {
  // Fetch templates
  const { data: templates, error } = await supabase
    .from('airledger_transaction_templates')
    .select('*')
    .or(`is_system_template.eq.true,user_id.eq.${userId}`)
    .eq('auto_suggest', true)
    .order('usage_count', { ascending: false });

  if (error || !templates?.length) {
    console.error('Template fetch error:', error);
    return null;
  }

  // 1. Exact match on template hint
  let match: TemplateMatch | null = null;

  if (intent.matched_template_hint) {
    const hint = intent.matched_template_hint.toLowerCase();
    const exact = templates.find((t: any) =>
      t.template_name.toLowerCase() === hint
    );
    if (exact) {
      match = { template: exact, match_type: 'exact', confidence: 0.95 };
    }

    if (!match) {
      // Partial name match
      const partial = templates.find((t: any) =>
        t.template_name.toLowerCase().includes(hint) ||
        hint.includes(t.template_name.toLowerCase())
      );
      if (partial) {
        match = { template: partial, match_type: 'exact', confidence: 0.85 };
      }
    }
  }

  // 2. Category match
  if (!match) {
    const categories = INTENT_TO_CATEGORY[intent.intent] || [];
    if (categories.length > 0) {
      const categoryMatch = templates.find((t: any) =>
        categories.some(cat =>
          t.category.toLowerCase().includes(cat) ||
          t.description.toLowerCase().includes(cat)
        )
      );
      if (categoryMatch) {
        match = { template: categoryMatch, match_type: 'category', confidence: 0.7 };
      }
    }
  }

  // 3. Keyword match from extracted data
  if (!match) {
    const searchTerms = [
      intent.extracted_data.description,
      intent.extracted_data.vendor,
    ].filter(Boolean).map(s => s!.toLowerCase());

    if (searchTerms.length > 0) {
      let bestMatchCandidate: any = null;
      let bestScore = 0;

      for (const template of templates) {
        const keywords: string[] = template.keywords || [];
        const allTerms = [
          ...keywords.map((k: string) => k.toLowerCase()),
          template.template_name.toLowerCase(),
          template.description.toLowerCase(),
        ];

        let score = 0;
        for (const term of searchTerms) {
          for (const kwrd of allTerms) {
            if (kwrd.includes(term) || term.includes(kwrd)) {
              score++;
            }
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatchCandidate = template;
        }
      }

      if (bestMatchCandidate && bestScore > 0) {
        match = {
          template: bestMatchCandidate,
          match_type: 'keyword',
          confidence: Math.min(0.6 + bestScore * 0.1, 0.85),
        };
      }
    }
  }

  // 4. Apply amount-based overrides (e.g. inventarie vs anläggningstillgång)
  if (match) {
    match = applyAmountOverride(match, intent.extracted_data.amount, templates);
    match = await applyWarningsFromDb(match, intent.extracted_data.amount, supabase);
    return match;
  }

  return null;
}

/**
 * Apply amount-based overrides: e.g. if amount > halva prisbasbeloppet,
 * switch from Förbrukningsinventarie to Inköp dator/laptop.
 */
function applyAmountOverride(
  match: TemplateMatch,
  amount: number | undefined | null,
  allTemplates: any[]
): TemplateMatch {
  if (!amount || amount <= 0) return match;

  const matchedName = match.template.template_name;

  for (const rule of AMOUNT_OVERRIDES) {
    if (!rule.fromTemplates.includes(matchedName)) continue;

    const shouldOverride =
      rule.direction === 'above' ? amount > rule.threshold : amount < rule.threshold;

    if (shouldOverride) {
      const replacement = allTemplates.find(
        (t: any) => t.template_name === rule.toTemplate
      );
      if (replacement) {
        console.log(`Amount override: ${matchedName} → ${rule.toTemplate} (${amount} kr, threshold ${rule.threshold})`);
        return { template: replacement, match_type: match.match_type, confidence: match.confidence };
      }
    }
  }

  return match;
}

/**
 * Apply warning rules from DB based on amount and matched template.
 */
async function applyWarningsFromDb(
  match: TemplateMatch,
  amount: number | undefined | null,
  supabase: any
): Promise<TemplateMatch> {
  if (!amount || amount <= 0) return match;

  const dbRules = await fetchWarningRules(supabase);
  const warnings: string[] = [];
  const matchedName = match.template.template_name;

  for (const rule of dbRules) {
    if (!rule.template_names.includes(matchedName)) continue;
    const warning = checkDbWarningRule(rule, amount);
    if (warning) warnings.push(warning);
  }

  if (warnings.length > 0) {
    return { ...match, warnings };
  }
  return match;
}

export function getTopTemplateCandidates(
  templates: any[],
  intent: IntentClassification,
  limit: number = 3
): any[] {
  const categories = INTENT_TO_CATEGORY[intent.intent] || [];

  // Sort by relevance: category match first, then usage count
  const scored = templates.map(t => {
    let score = t.usage_count || 0;
    if (categories.some(cat => t.category.toLowerCase().includes(cat))) {
      score += 1000;
    }
    return { ...t, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, limit);
}
