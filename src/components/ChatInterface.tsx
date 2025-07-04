import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, Bot, User, Volume2, MessageCircle, Paperclip, X, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'voice' | 'image';
  images?: Array<{
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
  }>;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hej! Jag är din AI-assistent för bokföring. Hur kan jag hjälpa dig idag? Du kan chatta med mig eller ladda upp bilder på kvitton, fakturor och kontoutdrag.',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<Array<{
    id: string;
    file: File;
    preview: string;
  }>>([]);
  const { toast } = useToast();

  const handleImageUpload = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Endast bilder tillåtna",
        description: "Vänligen välj endast bildfiler (JPG, PNG, etc.)",
        variant: "destructive",
      });
    }

    imageFiles.forEach(file => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);
      
      setPendingImages(prev => [...prev, { id, file, preview }]);
    });
  };

  const removePendingImage = (imageId: string) => {
    setPendingImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && pendingImages.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue || (pendingImages.length > 0 ? "Bifogade bilder för analys" : ""),
      sender: 'user',
      timestamp: new Date(),
      type: pendingImages.length > 0 ? 'image' : 'text',
      images: pendingImages.length > 0 ? pendingImages.map(img => ({
        id: img.id,
        file: img.file,
        preview: img.preview
      })) : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setPendingImages([]);
    setIsLoading(true);

    // Simulate AI response (will be replaced with actual OpenAI integration)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: userMessage.type === 'image' 
          ? "Jag kan se dina bilder! Snart kommer jag att kunna analysera kvitton, fakturor och kontoutdrag med OpenAI Vision API för att extrahera viktig information automatiskt."
          : "Tack för din fråga! Jag kommer snart att kunna hjälpa dig med bokföringsrelaterade frågor med hjälp av OpenAI:s API. För tillfället är jag i testläge.",
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleVoiceRecording = () => {
    if (!isRecording) {
      // Start recording (will be implemented with Whisper API)
      setIsRecording(true);
      toast({
        title: "Röstinspelning",
        description: "Kommer snart att integreras med OpenAI Whisper API",
      });
      
      // Simulate recording end
      setTimeout(() => {
        setIsRecording(false);
      }, 3000);
    } else {
      setIsRecording(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">AI-Assistent</h1>
              <p className="text-sm text-muted-foreground">Redo att hjälpa</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-success-light text-success">
            <div className="w-2 h-2 bg-success rounded-full mr-2" />
            Online
          </Badge>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="container px-4 py-6 flex-1">
        <Card className="h-[calc(100vh-200px)] border-border/50 bg-surface shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chatt med AI-Assistent
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-full">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'ai' && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground flex-shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  
                   <div
                     className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                       message.sender === 'user'
                         ? 'bg-gradient-primary text-primary-foreground'
                         : 'bg-background border border-border/50'
                     }`}
                   >
                     {message.images && message.images.length > 0 && (
                       <div className="grid grid-cols-2 gap-2 mb-3">
                         {message.images.map((image) => (
                           <img
                             key={image.id}
                             src={image.preview}
                             alt="Uploaded document"
                             className="w-full h-20 object-cover rounded-md border border-border/30"
                           />
                         ))}
                       </div>
                     )}
                     <p className="text-sm leading-relaxed">{message.content}</p>
                     <p className="text-xs opacity-70 mt-2">
                       {message.timestamp.toLocaleTimeString('sv-SE', { 
                         hour: '2-digit', 
                         minute: '2-digit' 
                       })}
                     </p>
                   </div>

                  {message.sender === 'user' && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-background border border-border/50 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-border/50 pt-4">
              {/* Pending Images Preview */}
              {pendingImages.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileImage className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Bifogade bilder ({pendingImages.length})</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {pendingImages.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.preview}
                          alt="Pending upload"
                          className="w-16 h-16 object-cover rounded-md border border-border/50"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full"
                          onClick={() => removePendingImage(image.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="lg"
                  className="px-3"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) handleImageUpload(files);
                    };
                    input.click();
                  }}
                  disabled={isLoading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Fråga om bokföring eller bifoga bilder av kvitton..."
                    className="pr-12 bg-background border-border/50 focus:border-primary"
                    disabled={isLoading}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={handleSendMessage}
                    disabled={(!inputValue.trim() && pendingImages.length === 0) || isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button
                  variant={isRecording ? "destructive" : "professional"}
                  size="lg"
                  onClick={handleVoiceRecording}
                  className={`px-4 ${isRecording ? 'animate-pulse' : ''}`}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2 text-center">
                AI-assistenten kommer att integreras med OpenAI för intelligent bokföringshjälp
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatInterface;