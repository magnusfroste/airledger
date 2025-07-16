import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface DemoMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface DemoChatProps {
  onClose: () => void;
}

const DemoChat = ({ onClose }: DemoChatProps) => {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Prevent background scroll on mobile when chat is open
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isMobile]);

  const demoSteps = [
    {
      trigger: 'start',
      aiResponse: "Hej! Jag är Air, din AI-assistent för bokföring. 🤖\n\nJag hjälper svenska småföretag med allt från kvittoanalys till BAS-kontoplanen. Jag förstår svenska och gör bokföringen superenkel!\n\nVad är du nyfiken på?",
      suggestions: [
        "Hur fungerar kvittoanalys?",
        "Vad är BAS-kontoplanen?",
        "Kan du hjälpa med moms?"
      ]
    },
    {
      trigger: "Hur fungerar kvittoanalys?",
      aiResponse: "Fantastisk fråga! 📸\n\nKvittoanalysen fungerar så här:\n1. **Ta en bild** av ditt kvitto (eller ladda upp från galleriet)\n2. **Jag läser** automatiskt datum, belopp, leverantör och vad köpet gäller\n3. **Föreslår rätt BAS-konto** - t.ex. 6110 för kontorsmaterial\n4. **Du bekräftar** eller justerar - klart!\n\nDet som skulle ta 5 minuter tar nu 30 sekunder. Magiskt, eller hur? ✨",
      suggestions: [
        "Vilka kvitton kan du läsa?",
        "Vad händer med moms?",
        "Berätta mer om BAS-kontoplanen"
      ]
    },
    {
      trigger: "Vad är BAS-kontoplanen?",
      aiResponse: "BAS-kontoplanen är grunden för svensk bokföring! 📚\n\n**Vad är BAS?**\n• **B**okföring\n• **A**rbeitsgruppen\n• **S**tandard - den svenska standarden för kontoplan\n\n**Exempel på BAS-konton:**\n• 1910 - Kassa\n• 1930 - Bankkonto\n• 6110 - Kontorsmaterial\n• 2640 - Ingående moms\n\nJag känner alla 100+ BAS-konton och föreslår automatiskt rätt konto för dina kvitton. Ingen mer gissning! 🎯",
      suggestions: [
        "Hur väljer du rätt BAS-konto?",
        "Kan jag ändra kontoplanen?",
        "Visa mig kvittoanalys!"
      ]
    },
    {
      trigger: "Kan du hjälpa med moms?",
      aiResponse: "Absolut! Moms är mitt specialområde! 💰\n\n**Vad jag gör automatiskt:**\n• **Känner igen moms-% från kvitton** (25%, 12%, 6%)\n• **Bokför på rätt momskonton** (2641, 2611 osv)\n• **Räknar ut netto vs brutto** belopp\n• **Hanterar momsfria köp** korrekt\n\n**Exempel:**\nKvitto på 125kr → Jag ser att det är 100kr + 25kr moms (25%)\n→ Bokför: 100kr på kostnadskonto + 25kr på 2641 (ingående moms)\n\nIngen mer huvudräkning! 🧮",
      suggestions: [
        "Vad händer vid 0% moms?",
        "Kan du hantera utländska kvitton?",
        "Kom igång nu!"
      ]
    }
  ];

  const finalSuggestions = [
    "Kom igång gratis nu!",
    "Se prisinformation",
    "Ställ en annan fråga"
  ];

  useEffect(() => {
    // Start with welcome message
    if (messages.length === 0) {
      const welcomeMessage: DemoMessage = {
        id: '1',
        content: demoSteps[0].aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setIsTyping(true);
      setTimeout(() => {
        setMessages([welcomeMessage]);
        setIsTyping(false);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSuggestionClick = (suggestion: string) => {
    // Add user message
    const userMessage: DemoMessage = {
      id: Date.now().toString(),
      content: suggestion,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Handle special final suggestions
    if (suggestion === "Kom igång gratis nu!") {
      window.location.href = "/auth";
      return;
    }

    if (suggestion === "Se prisinformation") {
      onClose();
      // Scroll to pricing section
      setTimeout(() => {
        document.querySelector('[data-section="pricing"]')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    if (suggestion === "Ställ en annan fråga") {
      // Reset to beginning
      setCurrentStep(0);
      const welcomeMessage: DemoMessage = {
        id: Date.now().toString() + '_reset',
        content: demoSteps[0].aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, welcomeMessage]);
        setIsTyping(false);
      }, 1500);
      return;
    }

    // Find matching demo step
    const nextStep = demoSteps.find(step => step.trigger === suggestion);
    if (nextStep) {
      setIsTyping(true);
      setTimeout(() => {
        const aiMessage: DemoMessage = {
          id: Date.now().toString() + '_ai',
          content: nextStep.aiResponse,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
        setCurrentStep(demoSteps.indexOf(nextStep));
      }, 1500);
    }
  };

  const getCurrentSuggestions = () => {
    if (currentStep >= demoSteps.length - 1 && messages.length > 6) {
      return finalSuggestions;
    }
    return demoSteps[currentStep]?.suggestions || [];
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}
      
      <div className={cn(
        "relative bg-background border border-border shadow-2xl flex flex-col",
        isMobile 
          ? "fixed inset-4 z-50 rounded-2xl max-h-[calc(100vh-2rem)]" 
          : "rounded-2xl h-[600px]"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Air - Din AI-assistent</h3>
              <p className="text-xs text-muted-foreground">Demo-läge</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size={isMobile ? "default" : "sm"} 
            onClick={onClose}
            className={isMobile ? "h-10 w-10 p-0" : ""}
          >
            <X className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.sender === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {message.sender === 'ai' && (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            
            <div
              className={cn(
                "max-w-[80%] p-3 rounded-lg whitespace-pre-line",
                message.sender === 'user'
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted"
              )}
            >
              {message.content}
            </div>

            {message.sender === 'user' && (
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Suggestions */}
        {!isTyping && (
          <div className="p-4 border-t border-border flex-shrink-0">
            <div className="flex flex-wrap gap-2">
              {getCurrentSuggestions().map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    isMobile ? "text-sm min-h-[44px] px-4" : "text-xs",
                    "touch-manipulation"
                  )}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DemoChat;