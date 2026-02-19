/**
 * Fiscal year utilities.
 * fiscal_year_start = 1 means calendar year (Jan-Dec), which is the default.
 * fiscal_year_start = 5/7/9 means broken fiscal year starting that month.
 */

export interface FiscalYearRange {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Get the fiscal year range that contains `referenceDate`.
 * For calendar year (fiscalYearStart=1), this is simply Jan 1 – Dec 31.
 * For broken years (e.g. fiscalYearStart=7), e.g. Jul 1 2025 – Jun 30 2026.
 */
export function getCurrentFiscalYear(fiscalYearStart: number, referenceDate = new Date()): FiscalYearRange {
  const month = referenceDate.getMonth() + 1; // 1-indexed
  const year = referenceDate.getFullYear();

  let startYear: number;
  if (fiscalYearStart === 1) {
    startYear = year;
  } else {
    // If current month is before fiscal start, the fiscal year started last calendar year
    startYear = month >= fiscalYearStart ? year : year - 1;
  }

  const start = new Date(startYear, fiscalYearStart - 1, 1);
  const end = new Date(startYear + 1, fiscalYearStart - 1, 0); // Last day of month before next fiscal start

  const label = fiscalYearStart === 1
    ? `${startYear}`
    : `${formatLocalDate(start)} – ${formatLocalDate(end)}`;

  return { start, end, label };
}

/**
 * Get the previous fiscal year range relative to the current one.
 */
export function getPreviousFiscalYear(fiscalYearStart: number, referenceDate = new Date()): FiscalYearRange {
  const current = getCurrentFiscalYear(fiscalYearStart, referenceDate);
  // Go back one year from the start of current fiscal year
  const prevRef = new Date(current.start);
  prevRef.setMonth(prevRef.getMonth() - 1);
  return getCurrentFiscalYear(fiscalYearStart, prevRef);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a fiscal year is a broken (non-calendar) year.
 */
export function isBrokenFiscalYear(fiscalYearStart: number): boolean {
  return fiscalYearStart !== 1;
}
