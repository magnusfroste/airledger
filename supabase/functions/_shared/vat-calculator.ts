/**
 * Shared VAT / entry-amount calculation logic.
 * Single source of truth — used by both response-formatter and field-analyzer.
 */

export function calculateEntryAmount(entry: any, baseAmount: number): number {
  if (entry.vat_calculation) {
    if (entry.vat_calculation === 'exclude_vat') {
      return Math.round(baseAmount / 1.25 * 100) / 100;
    }
    if (entry.vat_calculation === 'exclude_vat_12') {
      return Math.round(baseAmount / 1.12 * 100) / 100;
    }
    if (entry.vat_calculation === 'exclude_vat_6') {
      return Math.round(baseAmount / 1.06 * 100) / 100;
    }
    if (entry.vat_calculation === 'vat_only') {
      return Math.round((baseAmount - baseAmount / 1.25) * 100) / 100;
    }
    if (entry.vat_calculation === 'vat_only_12') {
      return Math.round((baseAmount - baseAmount / 1.12) * 100) / 100;
    }
    if (entry.vat_calculation === 'vat_only_6') {
      return Math.round((baseAmount - baseAmount / 1.06) * 100) / 100;
    }
    if (entry.vat_calculation === 'total_amount') {
      return baseAmount;
    }
    // Legacy: extract rate from string like "vat_25" or "moms_25"
    const vatMatch = entry.vat_calculation.match(/(\d+)/);
    if (vatMatch) {
      const vatRate = parseInt(vatMatch[1]) / 100;
      if (entry.vat_calculation.includes('moms') || entry.vat_calculation.includes('vat')) {
        return Math.round(baseAmount * vatRate * 100) / 100;
      }
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

  // Use template entry ratios as multipliers
  const debitRatio = parseFloat(entry.debit_amount) || 0;
  const creditRatio = parseFloat(entry.credit_amount) || 0;
  const ratio = debitRatio > 0 ? debitRatio : creditRatio;

  if (ratio > 0 && ratio !== 1) {
    return Math.round(baseAmount * ratio * 100) / 100;
  }

  return baseAmount;
}
