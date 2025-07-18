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
}

export interface FunctionCallArgs {
  [key: string]: any;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
      tool_calls?: Array<{
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
}