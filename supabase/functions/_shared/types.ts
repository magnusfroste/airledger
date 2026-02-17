export interface ConversationMessage {
  sender: string;
  content: string;
}

export interface AccountBalance {
  account_code: string;
  account_name: string;
  balance: number;
  normal_balance: string; // 'debit' | 'credit'
}

export interface VendorPattern {
  vendor: string;
  template_name: string;
  avg_amount: number;
  count: number;
  last_date: string;
}

export interface TemplatePreference {
  template_name: string;
  usage_count: number;
  last_used: string;
}

export interface UserData {
  userId: string;
  userName: string;
  accountingMethod: 'cash' | 'accrual';
  transactions: any[];
  openingBalances: any[];
  chartOfAccounts: any[];
  templates: any[];
  recentTransactions?: any[];
  profile?: any;
  vatSummary?: VatSummary;
  accountBalances?: AccountBalance[];
  vendorPatterns?: VendorPattern[];
  templatePreferences?: TemplatePreference[];
}

export interface VatSummary {
  outputVat: number;
  inputVat: number;
  netVat: number;
  quarterLabel: string;
}

export interface FunctionCallArgs {
  [key: string]: any;
}

// Intent Router types
export type IntentType =
  | 'book_expense'
  | 'book_sale'
  | 'book_payment'
  | 'opening_balance'
  | 'confirm_booking'
  | 'ask_question'
  | 'view_report'
  | 'analyze_image'
  | 'vat_report'
  | 'period_reconciliation'
  | 'year_end'
  | 'account_balance'
  | 'unknown';

export interface ExtractedData {
  amount?: number;
  date?: string;
  description?: string;
  vendor?: string;
  vat_rate?: number;
  reference?: string;
  payment_method?: string;
}

export interface IntentClassification {
  intent: IntentType;
  extracted_data: ExtractedData;
  matched_template_hint?: string;
  confidence: number;
  clarification_needed?: string | null;
}

export interface TemplateMatch {
  template: any;
  match_type: 'exact' | 'category' | 'keyword' | 'fallback';
  confidence: number;
  warnings?: string[];
}

export interface BookingProposal {
  template: any;
  entries: Array<{
    account_code: string;
    account_name: string;
    debit_amount: number;
    credit_amount: number;
  }>;
  total_amount: number;
  date: string;
  description: string;
}

// Required field definition for template-driven data collection
export interface RequiredField {
  key: string;
  label: string;
  prompt: string;
  type: 'amount' | 'text' | 'date';
  maps_to_entry?: number;
  calc?: string; // e.g. "acquisition_value - selling_price"
}

export interface FieldAnalysisResult {
  complete: boolean;
  fieldValues: Record<string, number | string>;
  nextQuestion?: string;
  nextFieldKey?: string;
  templateName?: string;
}

// Bank statement transaction (used by analyze-bank-statement)
export interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  suggested_category?: string;
  suggested_account_code?: string;
  suggested_account_name?: string;
  counterpart_account_code?: string;
  counterpart_account_name?: string;
  vat_applicable?: boolean;
  vat_rate?: number;
  confidence?: number;
  _matched_template?: string;
}
