import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatActionButtons from "./ChatActionButtons";
import BankStatementReview from "./BankStatementReview";

interface MessageImage {
  id: string;
  file: File;
  preview: string;
  analysis?: {
    type: 'receipt' | 'invoice' | 'bank_statement';
    amount?: number;
    vendor?: string;
    date?: string;
    description?: string;
  };
}

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: "expense" | "income";
  suggested_category: string;
  suggested_account_code: string;
  suggested_account_name: string;
  counterpart_account_code: string;
  counterpart_account_name: string;
  vat_applicable: boolean;
  vat_rate: number;
  confidence: number;
}

interface BankStatementAnalysis {
  bank_name: string;
  account_number?: string;
  period?: string;
  transactions: BankTransaction[];
  total_transactions: number;
  summary: string;
}

interface MessageProps {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'voice' | 'image' | 'bank_review';
  images?: MessageImage[];
  isLastAiMessage?: boolean;
  onAction?: (message: string) => void;
  bankAnalysis?: BankStatementAnalysis;
  bankReviewStatus?: 'pending' | 'booking' | 'done';
  onBankConfirm?: (transactions: BankTransaction[]) => void;
  onBankDismiss?: () => void;
}

const Message = ({ content, sender, type, images, isLastAiMessage, onAction, bankAnalysis, bankReviewStatus, onBankConfirm, onBankDismiss }: MessageProps) => {
  const isBookingProposal = sender === 'ai'
    && content.includes('Bokföringsförslag')
    && content.includes('Ska jag bokföra detta?');
  const isBankReview = type === 'bank_review' && bankAnalysis;

  return (
    <div className={`flex gap-3 ${sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${sender === 'user' ? 'order-1' : 'order-2'}`}>
        <div className={`px-5 py-4 rounded-3xl ${sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-lg' : 'bg-muted rounded-bl-lg'}`}>
          {type === 'image' && images && (
            <div className="space-y-3 mb-3">
              {images.map(image => (
                <div key={image.id} className="relative">
                  <img src={image.preview} alt="Uploaded image" className="max-w-full h-auto rounded-2xl" />
                  {image.analysis && (
                    <div className="mt-2 p-3 bg-background/90 rounded-xl">
                      <Badge variant="secondary" className="mb-2">
                        {image.analysis.type === 'receipt' ? 'Kvitto' : 'Faktura'}
                      </Badge>
                      <p className="text-sm">
                        <strong>{image.analysis.vendor}</strong> - {image.analysis.amount} kr
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {image.analysis.date}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {isBankReview ? (
            <BankStatementReview
              analysis={bankAnalysis}
              onConfirmSelected={(txs) => onBankConfirm?.(txs)}
              onDismiss={() => onBankDismiss?.()}
              isLoading={bankReviewStatus === 'booking'}
              isDone={bankReviewStatus === 'done'}
            />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2 rounded-lg border border-border">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/50">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border-t border-border">{children}</td>
                  ),
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  ul: ({ children }) => <ul className="ml-2 space-y-1">{children}</ul>,
                  li: ({ children }) => <li className="flex gap-1"><span>•</span><span>{children}</span></li>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {isBookingProposal && isLastAiMessage && onAction && (
          <ChatActionButtons onAction={onAction} />
        )}
      </div>
    </div>
  );
};

export default Message;