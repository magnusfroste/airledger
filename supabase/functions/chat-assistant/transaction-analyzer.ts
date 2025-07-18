
export interface TransactionContext {
  direction: 'PURCHASE' | 'SALE' | 'PAYMENT' | 'UNCLEAR';
  confidence: number;
  accountingMethod: 'CASH' | 'ACCRUAL';
  suggestedAccount?: string;
  amountType?: 'INCL_VAT' | 'EXCL_VAT' | 'UNKNOWN';
  warnings: string[];
  requiresConfirmation: boolean;
}

export interface TransactionAnalysis {
  vendor?: string;
  customer?: string;
  amount?: number;
  date?: string;
  description: string;
  context: TransactionContext;
  suggestedTemplate?: string;
}

// Språkmönster för att identifiera transaktionsriktning
const PURCHASE_PATTERNS = [
  /fått.*faktura.*från/i,
  /köpt.*från/i,
  /betalat.*till/i,
  /räkning.*från/i,
  /kostnad.*för/i,
  /utgift.*för/i,
  /hyra.*från/i,
  /abonnemang.*hos/i
];

const SALE_PATTERNS = [
  /skickat.*faktura.*till/i,
  /sålt.*till/i,
  /fakturerat/i,
  /intäkt.*från/i,
  /försäljning.*till/i,
  /arvode.*till/i
];

const PAYMENT_PATTERNS = [
  /fått.*betalning.*från/i,
  /betalning.*från.*kund/i,
  /kund.*betalat/i,
  /erhållit.*betalning/i
];

// Kontotyper och deras mönster
const ACCOUNT_MAPPING = {
  'telekommunikation': { code: '6410', patterns: [/bredband/i, /internet/i, /telefon/i, /telia/i, /telenor/i, /tre/i] },
  'hyra': { code: '5010', patterns: [/hyra/i, /lokalhyra/i] },
  'kontorsmaterial': { code: '6110', patterns: [/kontorsmaterial/i, /papper/i, /pennor/i] },
  'programvara': { code: '6212', patterns: [/programvara/i, /licens/i, /abonnemang.*program/i] },
  'konsult': { code: '6970', patterns: [/konsult/i, /rådgivning/i, /tjänst/i] },
  'el': { code: '5460', patterns: [/el.*kostnad/i, /elräkning/i, /vattenfall/i, /eon/i] },
  'försäkring': { code: '6420', patterns: [/försäkring/i] },
  'bränsle': { code: '5611', patterns: [/bensin/i, /diesel/i, /bränsle/i] }
};

export function analyzeTransactionText(text: string, accountingMethod: 'CASH' | 'ACCRUAL' = 'ACCRUAL'): TransactionAnalysis {
  const analysis: TransactionAnalysis = {
    description: text,
    context: {
      direction: 'UNCLEAR',
      confidence: 0,
      accountingMethod,
      warnings: [],
      requiresConfirmation: false
    }
  };

  // Analysera riktning
  const directionAnalysis = analyzeDirection(text);
  analysis.context.direction = directionAnalysis.direction;
  analysis.context.confidence = directionAnalysis.confidence;

  // Extrahera aktörer (leverantör/kund)
  const actors = extractActors(text, analysis.context.direction);
  analysis.vendor = actors.vendor;
  analysis.customer = actors.customer;

  // Extrahera belopp
  const amountMatch = text.match(/(\d+(?:\s?\d+)*(?:[,\.]\d{2})?)\s*kr/i);
  if (amountMatch) {
    analysis.amount = parseFloat(amountMatch[1].replace(/\s/g, '').replace(',', '.'));
  }

  // Extrahera datum
  analysis.date = extractDate(text);

  // Föreslå konto baserat på innehåll
  analysis.context.suggestedAccount = suggestAccount(text);

  // Bestäm om bekräftelse krävs
  analysis.context.requiresConfirmation = shouldRequireConfirmation(analysis);

  // Föreslå mall baserat på riktning och bokföringsmetod
  analysis.suggestedTemplate = suggestTemplate(analysis);

  return analysis;
}

function analyzeDirection(text: string): { direction: TransactionContext['direction'], confidence: number } {
  let purchaseScore = 0;
  let saleScore = 0;
  let paymentScore = 0;

  // Kontrollera köpmönster
  PURCHASE_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) purchaseScore += 1;
  });

  // Kontrollera säljmönster
  SALE_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) saleScore += 1;
  });

  // Kontrollera betalmningsmönster
  PAYMENT_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) paymentScore += 1;
  });

  const totalMatches = purchaseScore + saleScore + paymentScore;
  if (totalMatches === 0) {
    return { direction: 'UNCLEAR', confidence: 0 };
  }

  if (purchaseScore > saleScore && purchaseScore > paymentScore) {
    return { direction: 'PURCHASE', confidence: purchaseScore / totalMatches };
  } else if (saleScore > purchaseScore && saleScore > paymentScore) {
    return { direction: 'SALE', confidence: saleScore / totalMatches };
  } else if (paymentScore > purchaseScore && paymentScore > saleScore) {
    return { direction: 'PAYMENT', confidence: paymentScore / totalMatches };
  }

  return { direction: 'UNCLEAR', confidence: 0.3 };
}

function extractActors(text: string, direction: TransactionContext['direction']): { vendor?: string, customer?: string } {
  const result: { vendor?: string, customer?: string } = {};

  if (direction === 'PURCHASE') {
    // För inköp, leta efter leverantör efter "från"
    const vendorMatch = text.match(/från\s+([A-ZÅÄÖA-z]+(?:\s+[A-ZÅÄÖA-z]+)*)/i);
    if (vendorMatch) {
      result.vendor = vendorMatch[1].trim();
    }
  } else if (direction === 'SALE') {
    // För försäljning, leta efter kund efter "till"
    const customerMatch = text.match(/till\s+([A-ZÅÄÖA-z]+(?:\s+[A-ZÅÄÖA-z]+)*)/i);
    if (customerMatch) {
      result.customer = customerMatch[1].trim();
    }
  }

  return result;
}

function extractDate(text: string): string | undefined {
  // Leta efter olika datumformat
  const datePatterns = [
    /(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)/i,
    /(\d{1,2})\/(\d{1,2})/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/
  ];

  const monthMap: { [key: string]: string } = {
    'januari': '01', 'februari': '02', 'mars': '03', 'april': '04',
    'maj': '05', 'juni': '06', 'juli': '07', 'augusti': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'december': '12'
  };

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.includes('januari|februari')) {
        // Svenska månadsnamn
        const day = match[1].padStart(2, '0');
        const month = monthMap[match[2].toLowerCase()];
        return `2025-${month}-${day}`;
      } else if (pattern.source.includes('\\d{4}')) {
        // ISO format
        return match[0];
      } else {
        // DD/MM format - anta aktuellt år
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        return `2025-${month}-${day}`;
      }
    }
  }

  return undefined;
}

function suggestAccount(text: string): string | undefined {
  for (const [type, config] of Object.entries(ACCOUNT_MAPPING)) {
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        return config.code;
      }
    }
  }
  return undefined;
}

function shouldRequireConfirmation(analysis: TransactionAnalysis): boolean {
  // Kräv bekräftelse om:
  // - Låg confidence för riktning
  // - Oklar riktning
  // - Stort belopp (>10000 kr)
  // - Ingen föreslagen kontotyp
  
  if (analysis.context.confidence < 0.7) return true;
  if (analysis.context.direction === 'UNCLEAR') return true;
  if (analysis.amount && analysis.amount > 10000) return true;
  if (!analysis.context.suggestedAccount) return true;
  
  return false;
}

function suggestTemplate(analysis: TransactionAnalysis): string | undefined {
  const { direction, accountingMethod } = analysis.context;
  
  if (direction === 'PURCHASE') {
    return accountingMethod === 'CASH' 
      ? 'Betalning för inköp 25% moms'
      : 'Inköp 25% moms';
  } else if (direction === 'SALE') {
    return accountingMethod === 'CASH'
      ? 'Betalning från försäljning 25% moms'
      : 'Försäljning 25% moms';
  } else if (direction === 'PAYMENT') {
    return 'save_payment';
  }
  
  return undefined;
}
