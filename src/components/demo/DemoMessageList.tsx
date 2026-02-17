
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DemoMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  type: 'text' | 'demo-label';
  scenarioId?: string;
}

interface DemoMessageListProps {
  messages: DemoMessage[];
  isWaitingForAI: boolean;
}

const DemoMessageList = ({ messages, isWaitingForAI }: DemoMessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaitingForAI]);

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="space-y-4">
        {messages.map(msg => {
          if (msg.type === 'demo-label' || msg.sender === 'system') {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-accent/10 text-accent-foreground border border-accent/20 rounded-xl px-4 py-2 text-sm max-w-[90%]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              </div>
            );
          }

          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-3xl rounded-br-lg px-5 py-3 max-w-[85%] text-sm">
                  {msg.content}
                </div>
              </div>
            );
          }

          // AI message
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="bg-muted rounded-3xl rounded-bl-lg px-5 py-3 max-w-[85%] text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            </div>
          );
        })}

        {isWaitingForAI && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-3xl rounded-bl-lg px-5 py-4 max-w-[85%]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div ref={bottomRef} className="h-4" />
    </div>
  );
};

export default DemoMessageList;
