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
      {/* Chat Messages */}
      <div className="container px-6 py-6 flex-1 max-w-4xl mx-auto">
        <Card className="h-[calc(100vh-120px)] border-0 bg-transparent shadow-none">
          <CardHeader className="pb-6 px-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-medium text-foreground">
                  Bokföringsassistent
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-driven hjälp för din bokföring
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col h-full px-0">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto space-y-6 mb-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'ai' && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[75%] ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-3xl rounded-br-lg'
                        : 'bg-muted rounded-3xl rounded-bl-lg'
                    } px-5 py-4`}
                  >
                    {message.images && message.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {message.images.map((image) => (
                          <img
                            key={image.id}
                            src={image.preview}
                            alt="Uploaded document"
                            className="w-full h-24 object-cover rounded-xl"
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-60 mt-3">
                      {message.timestamp.toLocaleTimeString('sv-SE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>

                  {message.sender === 'user' && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0 mt-1">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-3xl rounded-bl-lg px-5 py-4">
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
            <div className="space-y-4">
              {/* Pending Images Preview */}
              {pendingImages.length > 0 && (
                <div className="bg-muted/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileImage className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground font-medium">Bifogade bilder ({pendingImages.length})</span>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {pendingImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.preview}
                          alt="Pending upload"
                          className="w-16 h-16 object-cover rounded-xl border border-border/20"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePendingImage(image.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 items-end">
                <Button
                  variant="ghost"
                  size="lg"
                  className="px-3 h-12 rounded-full"
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
                  <Paperclip className="h-5 w-5" />
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Meddelande..."
                    className="pl-6 pr-14 py-6 bg-muted border-0 rounded-full text-base focus:ring-2 focus:ring-primary/20"
                    disabled={isLoading}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-full"
                    onClick={handleSendMessage}
                    disabled={(!inputValue.trim() && pendingImages.length === 0) || isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  size="lg"
                  onClick={handleVoiceRecording}
                  className={`px-4 h-12 rounded-full ${isRecording ? 'animate-pulse' : ''}`}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatInterface;