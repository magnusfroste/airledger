import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, Bot, User, Volume2, MessageCircle, Paperclip, X, FileImage, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TransactionConfirmDialog from "@/components/TransactionConfirmDialog";

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
      content: 'Hej och välkommen! 👋 Jag är din AI-assistent för bokföring. Jag kan hjälpa dig med allt från kvittoanalys till att svara på frågor om din bokföring.\n\n**Vad kan jag hjälpa dig med?**\n• 📊 Ladda upp kvitton för automatisk analys och kontering\n• 💬 Svara på frågor om din bokföring och transaktioner\n• 📋 Ge råd om svensk bokföring och BAS-kontoplanen\n• 🤝 Diskutera dina bokföringsbehov\n\nVad undrar du över idag?',
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
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<any>(null);
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

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
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
    const currentPendingImages = [...pendingImages];
    setPendingImages([]);
    setIsLoading(true);

    try {
      if (currentPendingImages.length > 0) {
        // Process images with OpenAI
        for (const image of currentPendingImages) {
          try {
            const imageBase64 = await convertFileToBase64(image.file);
            
            const { data, error } = await supabase.functions.invoke('analyze-receipt', {
              body: { imageBase64 }
            });

            if (error) {
              console.error('Error analyzing receipt:', error);
              throw new Error(error.message || 'Failed to analyze receipt');
            }

            if (data?.success && data?.analysis) {
              const analysis = data.analysis;
              
              // Show confirmation dialog instead of auto-saving
              setPendingAnalysis(analysis);
              setConfirmDialogOpen(true);
              
              const aiResponse: Message = {
                id: (Date.now() + Math.random()).toString(),
                content: `🎯 **Kvittoanalys klar!**\n\n**${analysis.vendor}** - ${analysis.date}\n**Belopp:** ${analysis.total_amount} kr\n**Dokumenttyp:** ${analysis.document_type === 'receipt' ? 'Kvitto' : 'Faktura'} (${analysis.document_type_confidence}% säkerhet)\n\n**Föreslaget betalningssätt:** ${analysis.suggested_payment_method}\n\n📋 Klicka "Bekräfta bokföring" för att granska och spara transaktionen.`,
                sender: 'ai',
                timestamp: new Date(),
                type: 'text'
              };
              
              setMessages(prev => [...prev, aiResponse]);
              
              toast({
                title: "Kvitto analyserat!",
                description: `${analysis.vendor} - Väntar på bekräftelse`,
              });
            } else {
              throw new Error('Invalid response from analysis');
            }
          } catch (imageError) {
            console.error('Error processing image:', imageError);
            const errorResponse: Message = {
              id: (Date.now() + Math.random()).toString(),
              content: `❌ **Fel vid analys av kvitto**\n\nJag kunde inte analysera bilden. Kontrollera att det är ett tydligt kvitto och försök igen.\n\nFelmeddelande: ${imageError.message}`,
              sender: 'ai',
              timestamp: new Date(),
              type: 'text'
            };
            setMessages(prev => [...prev, errorResponse]);
            
            toast({
              title: "Analysfel",
              description: "Kunde inte analysera kvittot. Försök igen.",
              variant: "destructive",
            });
          }
        }
      } else {
        // Handle text-only messages with AI assistant
        try {
          // Prepare conversation history (last 10 messages for context)
          const conversationHistory = messages.slice(-10).map(msg => ({
            sender: msg.sender,
            content: msg.content
          }));

          const { data, error } = await supabase.functions.invoke('chat-assistant', {
            body: { 
              message: inputValue,
              conversationHistory: conversationHistory
            }
          });

          if (error) {
            console.error('Error calling chat assistant:', error);
            throw new Error(error.message || 'Failed to get AI response');
          }

          if (data?.success && data?.response) {
            const aiResponse: Message = {
              id: (Date.now() + 1).toString(),
              content: data.response,
              sender: 'ai',
              timestamp: new Date(),
              type: 'text'
            };
            setMessages(prev => [...prev, aiResponse]);
          } else {
            throw new Error('Invalid response from chat assistant');
          }
        } catch (chatError) {
          console.error('Error in text chat:', chatError);
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: `Ursäkta, jag har tekniska problem just nu. Försök igen om en stund eller ladda upp ett kvitto så kan jag analysera det åt dig!\n\nFel: ${chatError.message}`,
            sender: 'ai',
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, errorResponse]);
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorResponse: Message = {
        id: (Date.now() + Math.random()).toString(),
        content: `❌ **Ett fel uppstod**\n\nJag kunde inte behandla din förfrågan just nu. Försök igen om en stund.\n\nFelmeddelande: ${error.message}`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
      // Clean up image URLs
      currentPendingImages.forEach(img => URL.revokeObjectURL(img.preview));
    }
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

  const handleTransactionConfirm = async (analysis: any, entries: any[], paymentMethod: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('save-transaction', {
        body: { 
          analysis,
          entries,
          paymentMethod
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to save transaction');
      }

      if (data?.success && data?.transaction) {
        const aiResponse: Message = {
          id: (Date.now() + Math.random()).toString(),
          content: `✅ **Transaktion sparad!**\n\n**${analysis.vendor}** - ${analysis.date}\n**Belopp:** ${analysis.total_amount} kr\n**Betalning:** ${paymentMethod}\n\n**Bokföringsposter:**\n${entries.map((entry: any) => `• ${entry.account_code} ${entry.account_name}: ${entry.debit_amount > 0 ? `Debet ${entry.debit_amount} kr` : `Kredit ${entry.credit_amount} kr`}`).join('\n')}\n\n📋 Transaktionen är nu sparad som ett utkast i systemet.`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };
        
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Chat Messages */}
      <div className="container px-6 py-6 flex-1 max-w-4xl mx-auto">
        <div className="h-[calc(100vh-120px)] flex flex-col">
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
        </div>
      </div>

      {/* Transaction Confirmation Dialog */}
      <TransactionConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        analysis={pendingAnalysis}
        onConfirm={handleTransactionConfirm}
      />
    </div>
  );
};

export default ChatInterface;