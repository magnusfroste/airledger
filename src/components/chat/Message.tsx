import { Badge } from "@/components/ui/badge";

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

interface MessageProps {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'voice' | 'image';
  images?: MessageImage[];
}

const Message = ({ content, sender, type, images }: MessageProps) => {
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
          
          <div className="prose prose-sm max-w-none">
            {content.split('\n').map((line, index) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={index} className="font-bold mb-2">{line.slice(2, -2)}</p>;
              }
              if (line.startsWith('•')) {
                return <p key={index} className="ml-2 mb-1">{line}</p>;
              }
              return line ? <p key={index} className="mb-2">{line}</p> : <br key={index} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;