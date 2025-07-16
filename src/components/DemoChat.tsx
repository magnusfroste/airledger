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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
      aiResponse: "Hej! Jag är Air, din AI-assistent för bokföring. 🤖\n\nJag hjälper svenska småföretag med allt ifrån den löpande bokföringen, kontering samt kvittoanalys till BAS-kontoplanen. Jag förstår svenska och gör bokföringen superenkel!\n\nVad är du nyfiken på?",
      suggestions: [
        "Vad kan du bokföra åt mig?",
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
        "Kom igång gratis nu!"
      ]
    },
    {
      trigger: "Vad kan du bokföra åt mig?",
      aiResponse: "Jag kan hjälpa dig bokföra massa olika saker! 💼\n\n**Kvitton & Fakturor:**\n• 📸 Fotografera kvitton - jag läser allt automatiskt\n• 📄 Leverantörsfakturor\n• 🧾 Inköpskvitton från butiker\n• ⛽ Bensinkvitton och reseräkningar\n• 📋 **Utställda fakturor** - bokför automatiskt när du säger till\n\n**Olika transaktioner:**\n• 💳 Bankbetalningar\n• 💰 Kontantköp  \n• 🏦 Överföringar mellan konton\n• 📱 Swish-betalningar\n• 💸 **Fakturabetalningar** - kontera när kunden betalar\n\n**Skatter & Moms:**\n• 📊 **Preliminärskatt** - beräkna och bokför automatiskt\n• 📋 **Momsredovisning** - sammanställ alla momsposter\n• 📅 **Kontering för årsbokslut** - förbered bokslut enkelt\n\n**Speciella poster:**\n• 🏠 Hyror och lokalkostnader\n• ⚡ El, vatten, internet\n• 📞 Telefon och IT-tjänster\n• 🚗 Bilkostnader och transport\n\n**Smart fakturahantering:**\nSäg bara \"Jag har fått betalt för faktura 123\" så konterar jag automatiskt från kundreskontra till bankkonto! 🎯\n\nVilken typ av kvitto eller transaktion vill du börja med?",
      suggestions: [
        "Visa mig kvittoanalys!",
        "Hur fungerar BAS-kontoplanen?",
        "Kom igång gratis nu!"
      ]
    },
    {
      trigger: "Vilka kvitton kan du läsa?",
      aiResponse: "Jag kan läsa nästan alla typer av kvitton! 👀\n\n**Butiker & Restauranger:**\n• ICA, Coop, Willys - alla matvarukedjor\n• McDonald's, Max, lokala restauranger\n• Apoteket, systembolaget, bensinstationer\n\n**Teknik & Utrustning:**\n• MediaMarkt, Elgiganten, NetOnNet\n• Apple Store, Samsung, mobilbutiker\n• Webhallen, Komplett, IT-återförsäljare\n\n**Tjänster & Online:**\n• Taxi, Uber, kollektivtrafik\n• Amazon, Zalando, online-shopping\n• SaaS-tjänster, webbhotell, domäner\n\n**Speciella kvitton:**\n• Handskrivna kvitton (ibland)\n• Utländska kvitton (med översättning)\n• PDF-fakturor och e-kvitton\n\nJu tydligare kvittot är, desto bättre läser jag det! 📸✨",
      suggestions: [
        "Vad händer med moms?",
        "Kan du hantera utländska kvitton?",
        "Berätta mer om BAS-kontoplanen"
      ]
    },
    {
      trigger: "Vad händer med moms?",
      aiResponse: "Moms hanterar jag automatiskt! 🧮\n\n**Vad jag gör:**\n• **Identifierar momssatsen** från kvittot (25%, 12%, 6%, 0%)\n• **Delar upp beloppet** i netto + moms\n• **Väljer rätt momskonto** automatiskt\n• **Hanterar avdragsgill moms** för företag\n\n**Exempel från ICA-kvitto på 250kr:**\n```\nMat & dryck: 200kr (netto)\nMoms 25%: 50kr\nTotalt: 250kr\n```\n\n**Bokförs som:**\n• 200kr → 6420 (Representation, ej avdragsgill)\n• 50kr → 2645 (Ingående moms 25%, ej avdragsgill)\n\n**Smart momsuträkning** - inget mer huvudräkning! 🎯",
      suggestions: [
        "Vad händer vid 0% moms?",
        "Berätta mer om BAS-kontoplanen",
        "Visa mig kvittoanalys!"
      ]
    },
    {
      trigger: "Berätta mer om BAS-kontoplanen",
      aiResponse: "BAS är bokföringsstandarden i Sverige! 📚\n\n**Viktiga kontotyper:**\n\n**Tillgångar (1000-1999):**\n• 1910 - Kassa\n• 1930 - Bankkonto\n• 1510 - Kundfordringar\n\n**Skulder (2000-2999):**\n• 2440 - Leverantörsskulder\n• 2641 - Ingående moms 25%\n• 2611 - Utgående moms 25%\n\n**Kostnader (4000-7999):**\n• 6110 - Kontorsmaterial\n• 6420 - Representation\n• 7510 - Arbetskläder\n\n**Intäkter (3000-3999):**\n• 3010 - Försäljning varor\n• 3740 - Öres- och kronutjämning\n\nJag känner alla 100+ konton och föreslår alltid rätt! 🎯",
      suggestions: [
        "Hur väljer du rätt BAS-konto?",
        "Kan jag ändra kontoplanen?",
        "Kom igång nu!"
      ]
    },
    {
      trigger: "Hur väljer du rätt BAS-konto?",
      aiResponse: "Jag analyserar kvittot smart och väljer perfekt konto! 🤖\n\n**Min process:**\n1. **Läser leverantören** - \"ICA\" = mat/dryck\n2. **Analyserar produkterna** - \"Papper A4\" = kontorsmaterial\n3. **Kontrollerar sammanhanget** - företagskvitto vs privat\n4. **Matchar mot BAS-regler** - svensk bokföringsstandard\n\n**Exempel:**\n• 📋 **Kontorsmaterial** → 6110\n• 🍕 **Kundmiddag** → 6420 (Representation)\n• ⚡ **Elräkning** → 7390 (El)\n• 🚗 **Bensin** → 6212 (Bränslekostnader)\n• 📱 **Mobilabonnemang** → 6230 (Telefon)\n\n**Osäker?** Jag frågar alltid om du vill ändra! Du har alltid sista ordet. ✅",
      suggestions: [
        "Kan jag ändra kontoplanen?",
        "Vad händer med moms?",
        "Visa mig kvittoanalys!"
      ]
    },
    {
      trigger: "Kan jag ändra kontoplanen?",
      aiResponse: "Ja, du har full kontroll över din kontoplan! ⚙️\n\n**Vad du kan göra:**\n• **Lägga till egna konton** - skapa specialkonton för ditt företag\n• **Döpa om konton** - t.ex. \"6110 Kontorsmaterial\" → \"6110 Papper & pennor\"\n• **Inaktivera konton** du inte använder\n• **Sätta standardkonton** för återkommande leverantörer\n\n**BAS-standarden finns kvar** som grund, men du anpassar efter dina behov!\n\n**Exempel på anpassningar:**\n• Frisörsalong: \"7391 Hårvårdsprodukter\"\n• Restaurang: \"4010 Inköp råvaror\"\n• IT-konsult: \"6214 Utbildning & certifieringar\"\n\n**Smart tipps:** Jag lär mig dina vanor och föreslår dina favoritkonton! 🎯",
      suggestions: [
        "Vad kan du bokföra åt mig?",
        "Kom igång gratis nu!",
        "Hur fungerar kvittoanalys?"
      ]
    },
    {
      trigger: "Visa mig kvittoanalys!",
      aiResponse: "Perfekt! Här ser du hur det funkar i praktiken! 📸\n\n**Steg-för-steg:**\n\n1. **📱 Ta foto** av kvittot (eller ladda upp från galleriet)\n\n2. **🤖 Jag läser automatiskt:**\n   • Datum: 2024-01-15\n   • Leverantör: ICA Maxi\n   • Belopp: 127 kr\n   • Produkter: Kaffe, mjölk\n\n3. **💡 Föreslår bokföring:**\n   • Konto: 6420 (Representation)\n   • Netto: 102 kr\n   • Moms: 25 kr (25%)\n   • Kommentar: \"Kundmöte - kaffe\"\n\n4. **✅ Du bekräftar** (eller ändrar om du vill)\n\n5. **🎉 Klart!** Bokförd på 30 sekunder!\n\nVill du prova på riktigt?",
      suggestions: [
        "Kom igång gratis nu!",
        "Vad händer vid 0% moms?",
        "Kan du hantera utländska kvitton?"
      ]
    },
    {
      trigger: "Vad händer vid 0% moms?",
      aiResponse: "Bra fråga! 0% moms händer oftare än man tror! 📊\n\n**Vanliga 0% moms-fall:**\n• 📚 **Böcker & tidningar** - kulturstöd\n• 🎫 **Kollektivtrafik** - SL-kort, tågbiljetter\n• 💊 **Receptfria mediciner** - vissa apoteksköp\n• 🌍 **EU-handel** - vissa tjänster\n• 🏥 **Vårdtjänster** - läkarbesök, tandläkare\n\n**Så hanterar jag det:**\n• **Identifierar 0% automatiskt** från kvittot\n• **Ingen momspost** skapas (såklart!)\n• **Hela beloppet** på kostnadskontot\n• **Speciell markering** \"Momsfritt köp\"\n\n**Exempel - SL-månadskort 970kr:**\n• 970kr → 6250 (Kollektivtrafik)\n• 0kr moms → ingen momspost\n\nIngen moms att krångla med! 🎉",
      suggestions: [
        "Kan du hantera utländska kvitton?",
        "Berätta mer om BAS-kontoplanen",
        "Kom igång gratis nu!"
      ]
    },
    {
      trigger: "Kan du hantera utländska kvitton?",
      aiResponse: "Ja! Jag klarar kvitton från många länder! 🌍\n\n**Länder jag kan läsa:**\n• 🇬🇧 **Storbritannien** - pund → svenska kronor\n• 🇩🇪 **Tyskland** - euro → svenska kronor  \n• 🇺🇸 **USA** - dollar → svenska kronor\n• 🇩🇰 **Danmark/Norge** - danska/norska kronor\n• Och många fler EU-länder!\n\n**Vad jag gör automatiskt:**\n• **Översätter texten** till svenska\n• **Konverterar valutan** (aktuell kurs)\n• **Hanterar utländsk moms** korrekt\n• **Föreslår rätt BAS-konto** på svenska\n\n**Exempel - tysk restaurang:**\n• Original: \"Restaurant Berlin - 45,50 EUR\"\n• Blir: \"Restaurang Berlin - 523 kr\"\n• Konto: 6420 (Representation)\n• Kommentar: \"Affärsresa Tyskland\"\n\nResa utomlands? Inga problem! ✈️",
      suggestions: [
        "Vad händer vid 0% moms?",
        "Kom igång gratis nu!",
        "Ställ en annan fråga"
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
    // Scroll to bottom within the ScrollArea only, not the entire page
    if (messagesEndRef.current && scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
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
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
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