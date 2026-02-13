export interface ConversationMessage {
  sender: string;
  content: string;
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
