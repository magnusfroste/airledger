import { IntentClassification, TemplateMatch } from './types.ts';

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
  if (intent.matched_template_hint) {
    const hint = intent.matched_template_hint.toLowerCase();
    const exact = templates.find((t: any) =>
      t.template_name.toLowerCase() === hint
    );
    if (exact) {
      return { template: exact, match_type: 'exact', confidence: 0.95 };
    }

    // Partial name match
    const partial = templates.find((t: any) =>
      t.template_name.toLowerCase().includes(hint) ||
      hint.includes(t.template_name.toLowerCase())
    );
    if (partial) {
      return { template: partial, match_type: 'exact', confidence: 0.85 };
    }
  }

  // 2. Category match
  const categories = INTENT_TO_CATEGORY[intent.intent] || [];
  if (categories.length > 0) {
    const categoryMatch = templates.find((t: any) =>
      categories.some(cat =>
        t.category.toLowerCase().includes(cat) ||
        t.description.toLowerCase().includes(cat)
      )
    );
    if (categoryMatch) {
      return { template: categoryMatch, match_type: 'category', confidence: 0.7 };
    }
  }

  // 3. Keyword match from extracted data
  const searchTerms = [
    intent.extracted_data.description,
    intent.extracted_data.vendor,
  ].filter(Boolean).map(s => s!.toLowerCase());

  if (searchTerms.length > 0) {
    let bestMatch: any = null;
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
        bestMatch = template;
      }
    }

    if (bestMatch && bestScore > 0) {
      return {
        template: bestMatch,
        match_type: 'keyword',
        confidence: Math.min(0.6 + bestScore * 0.1, 0.85),
      };
    }
  }

  return null;
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
