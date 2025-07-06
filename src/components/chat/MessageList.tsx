import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import Message from "./Message";

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

interface MessageType {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'voice' | 'image';
  images?: MessageImage[];
}

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  onNewChat: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const MessageList = ({ messages, isLoading, onNewChat, messagesEndRef }: MessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/* New Chat Button */}
      <div className="flex justify-end mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onNewChat}
          className="text-muted-foreground hover:text-foreground transition-colors rounded-full px-3 py-1 h-8"
          disabled={isLoading}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Ny chat
        </Button>
      </div>

      {/* Messages */}
      <div className="space-y-6">
        {messages.slice(1).map(message => (
          <Message
            key={message.id}
            id={message.id}
            content={message.content}
            sender={message.sender}
            timestamp={message.timestamp}
            type={message.type}
            images={message.images}
          />
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-3xl rounded-bl-lg px-5 py-4 max-w-[85%]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div 
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div 
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Scroll anchor */}
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
};

export default MessageList;