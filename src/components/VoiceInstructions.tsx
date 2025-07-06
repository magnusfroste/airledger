import { Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const VoiceInstructions = () => {
  const instructions = [
    {
      title: "🧾 Utgifter & Kvitton",
      description: "Registrera företagsutgifter enkelt med naturligt språk",
      example: "Jag köpte kontorsmaterial för 850 kr på ICA",
      details: "AI:n föreslår rätt konto automatiskt. Du kan också ladda upp kvittobilder för analys."
    },
    {
      title: "📄 Utgående Fakturor",
      description: "Bokför fakturor du skickat till kunder",
      example: "Jag fakturerade Acme AB 15 000 kr exkl moms för konsulttjänster",
      details: "Bokförs som: Debet 1510 Kundfordringar, Kredit 3000 Försäljning + moms"
    },
    {
      title: "💰 Inkommande Betalningar",
      description: "Registrera när kunder betalar sina fakturor",
      example: "Acme AB betalade 18 750 kr till mitt bankkonto",
      details: "Bokförs som: Debet 1930 Checkkonto, Kredit 1510 Kundfordringar"
    },
    {
      title: "👥 Löner & Sociala avgifter",
      description: "Bokför löneutbetalningar och arbetsgivaravgifter",
      example: "Jag betalade ut lön 35 000 kr och sociala avgifter 11 000 kr",
      details: "AI:n hjälper med alla lönekonton: bruttolön, skatt, sociala avgifter"
    },
    {
      title: "🏦 Ingående Balanser",
      description: "Sätt startbalans när du börjar använda systemet",
      example: "Jag har 50 000 kr på checkkonto och kundfordringar på 25 000 kr",
      details: "AI:n förstår vilka konton som ska ha debet/kredit baserat på kontotyp"
    },
    {
      title: "📋 Mallar & Återkommande",
      description: "Använd mallar för återkommande transaktioner",
      example: "Använd mallen för hyra eller skapa en mall för detta",
      details: "Spara tid genom att återanvända vanliga bokföringar som mallar"
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            🗣️ Så här pratar du med AI-assistenten
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            AI-assistenten förstår svensk bokföring och BAS-kontoplanen 2024. 
            Här är några exempel på vad du kan säga:
          </div>

          {instructions.map((instruction, index) => (
            <div key={index} className="space-y-3 pb-4 border-b border-border last:border-b-0 last:pb-0">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">{instruction.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{instruction.description}</p>
                  
                  <div className="bg-muted/30 rounded-lg p-3 mb-2">
                    <div className="text-xs text-muted-foreground mb-1">Exempel:</div>
                    <div className="text-sm font-mono bg-background rounded px-2 py-1 border">
                      "{instruction.example}"
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground italic">
                    💡 {instruction.details}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Tips</Badge>
            </div>
            <div className="text-sm space-y-1">
              <div>• Prata naturligt - AI:n förstår svenska</div>
              <div>• Nämn belopp, konto och beskrivning</div>
              <div>• AI:n frågar efter vad som saknas</div>
              <div>• Använd mikrofon-knappen eller skriv text</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceInstructions;