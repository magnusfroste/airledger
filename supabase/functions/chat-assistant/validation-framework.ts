
import { TransactionAnalysis, TransactionContext } from './transaction-analyzer.ts';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
  requiresUserConfirmation: boolean;
}

export interface ValidationRule {
  name: string;
  validate: (analysis: TransactionAnalysis) => ValidationResult;
}

// Valideringsregler
const VALIDATION_RULES: ValidationRule[] = [
  {
    name: 'amount_clarity',
    validate: (analysis) => {
      const result: ValidationResult = {
        isValid: true,
        warnings: [],
        errors: [],
        suggestions: [],
        requiresUserConfirmation: false
      };

      if (analysis.amount && analysis.context.amountType === 'UNKNOWN') {
        result.warnings.push('Oklart om beloppet är inklusive eller exklusive moms');
        result.suggestions.push('Fråga användaren om beloppet är inkl/exkl moms');
        result.requiresUserConfirmation = true;
      }

      return result;
    }
  },
  {
    name: 'account_appropriateness',
    validate: (analysis) => {
      const result: ValidationResult = {
        isValid: true,
        warnings: [],
        errors: [],
        suggestions: [],
        requiresUserConfirmation: false
      };

      // Kontrollera att 4000 inte används för tjänster
      if (analysis.context.suggestedAccount === '4000') {
        const text = analysis.description.toLowerCase();
        const serviceKeywords = ['bredband', 'telefon', 'konsult', 'tjänst', 'hyra', 'el'];
        
        if (serviceKeywords.some(keyword => text.includes(keyword))) {
          result.errors.push('Konto 4000 "Inköp av varor" ska inte användas för tjänster');
          result.suggestions.push('Använd rätt kostnadskonto för denna typ av utgift');
          result.isValid = false;
        }
      }

      return result;
    }
  },
  {
    name: 'direction_confidence',
    validate: (analysis) => {
      const result: ValidationResult = {
        isValid: true,
        warnings: [],
        errors: [],
        suggestions: [],
        requiresUserConfirmation: false
      };

      if (analysis.context.confidence < 0.5) {
        result.warnings.push('Osäker på transaktionsriktning');
        result.suggestions.push('Förtydliga om det är ett inköp, försäljning eller betalning');
        result.requiresUserConfirmation = true;
      }

      if (analysis.context.direction === 'UNCLEAR') {
        result.errors.push('Kan inte avgöra transaktionsriktning');
        result.suggestions.push('Specificera tydligare vad transaktionen gäller');
        result.isValid = false;
      }

      return result;
    }
  },
  {
    name: 'actor_identification',
    validate: (analysis) => {
      const result: ValidationResult = {
        isValid: true,
        warnings: [],
        errors: [],
        suggestions: [],
        requiresUserConfirmation: false
      };

      if (analysis.context.direction === 'PURCHASE' && !analysis.vendor) {
        result.warnings.push('Leverantör kunde inte identifieras tydligt');
        result.suggestions.push('Specificera leverantörens namn');
      }

      if (analysis.context.direction === 'SALE' && !analysis.customer) {
        result.warnings.push('Kund kunde inte identifieras tydligt');
        result.suggestions.push('Specificera kundens namn');
      }

      return result;
    }
  }
];

export function validateTransaction(analysis: TransactionAnalysis): ValidationResult {
  const overallResult: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    suggestions: [],
    requiresUserConfirmation: false
  };

  // Kör alla valideringsregler
  for (const rule of VALIDATION_RULES) {
    const ruleResult = rule.validate(analysis);
    
    overallResult.warnings.push(...ruleResult.warnings);
    overallResult.errors.push(...ruleResult.errors);
    overallResult.suggestions.push(...ruleResult.suggestions);
    
    if (!ruleResult.isValid) {
      overallResult.isValid = false;
    }
    
    if (ruleResult.requiresUserConfirmation) {
      overallResult.requiresUserConfirmation = true;
    }
  }

  return overallResult;
}

export function generateValidationMessage(analysis: TransactionAnalysis, validation: ValidationResult): string {
  let message = '';

  // Grundläggande analys
  message += `🔍 **Transaktionsanalys**\n\n`;
  
  if (analysis.context.direction !== 'UNCLEAR') {
    const directionText = {
      'PURCHASE': 'Inköp',
      'SALE': 'Försäljning', 
      'PAYMENT': 'Betalning'
    }[analysis.context.direction];
    
    message += `**Typ:** ${directionText} (${Math.round(analysis.context.confidence * 100)}% säkerhet)\n`;
  }

  if (analysis.vendor) message += `**Leverantör:** ${analysis.vendor}\n`;
  if (analysis.customer) message += `**Kund:** ${analysis.customer}\n`;
  if (analysis.amount) message += `**Belopp:** ${analysis.amount} kr\n`;
  if (analysis.date) message += `**Datum:** ${analysis.date}\n`;
  if (analysis.context.suggestedAccount) message += `**Föreslaget konto:** ${analysis.context.suggestedAccount}\n`;

  // Varningar
  if (validation.warnings.length > 0) {
    message += `\n⚠️ **Varningar:**\n`;
    validation.warnings.forEach(warning => {
      message += `• ${warning}\n`;
    });
  }

  // Fel
  if (validation.errors.length > 0) {
    message += `\n❌ **Fel:**\n`;
    validation.errors.forEach(error => {
      message += `• ${error}\n`;
    });
  }

  // Förslag
  if (validation.suggestions.length > 0) {
    message += `\n💡 **Förslag:**\n`;
    validation.suggestions.forEach(suggestion => {
      message += `• ${suggestion}\n`;
    });
  }

  return message;
}
