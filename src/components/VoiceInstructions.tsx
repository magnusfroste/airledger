
import { Info } from "lucide-react";
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
      title: "💰 Preliminärskatt",
      description: "Bokför betalning av preliminärskatt till Skatteverket",
      example: "Jag ska betala preliminärskatt 5000 kr",
      details: "AI:n använder automatiskt systemmallen för preliminärskatt. Bokförs som: Debet 1630 Skattekonto, Kredit 1930 Checkkonto"
    },
    {
      title: "🧾 Utgifter & Kvitton",
      description: "Registrera företagsutgifter enkelt med naturligt språk",
      example: "Jag köpte kontorsmaterial för 850 kr på ICA",
      details: "AI:n föreslår rätt konto automatiskt baserat på systemmallar. Du kan också ladda upp kvittobilder för analys."
    },
    {
      title: "📄 Utgående Fakturor",
      description: "Bokför fakturor du skickat till kunder",
      example: "Jag fakturerade Acme AB 15 000 kr exkl moms för konsulttjänster",
      details: "Bokförs som: Debet 1510 Kundfordringar, Kredit 3000 Försäljning + moms enligt systemmall"
    },
    {
      title: "💸 Inkommande Betalningar",
      description: "Registrera när kunder betalar sina fakturor",
      example: "Acme AB betalade 18 750 kr till mitt bankkonto",
      details: "Bokförs som: Debet 1930 Checkkonto, Kredit 1510 Kundfordringar enligt betalingsmall"
    },
    {
      title: "👥 Löner & Sociala avgifter",
      description: "Bokför löneutbetalningar och arbetsgivaravgifter",
      example: "Jag betalade ut lön 35 000 kr och sociala avgifter 11 000 kr",
      details: "AI:n använder lönemall med alla rätta konton: bruttolön, skatt, sociala avgifter"
    },
    {
      title: "🎯 Egna Mallar & Specialfall",
      description: "Skapa anpassade mallar för dina specifika behov",
      example: "Skapa mall för denna transaktion eller använd mallen för hyra",
      details: "Om AI:n inte känner igen din transaktion kan du skapa egna mallar via Mallar-sidan. Systemmallar delas av alla användare, egna mallar är bara för dig."
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            🗣️ Så här pratar du med AI-assistenten
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            AI-assistenten förstår svensk bokföring och BAS-kontoplanen 2024. 
            Prata naturligt - AI:n väljer automatiskt rätt mall baserat på vad du säger!
          </div>

          <div className="grid gap-4">
            {instructions.map((instruction, index) => (
              <div key={index} className="space-y-3 p-4 border border-border rounded-lg bg-card/30">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm mb-1">{instruction.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{instruction.description}</p>
                    
                    <div className="bg-muted/40 rounded-lg p-3 mb-3">
                      <div className="text-xs text-muted-foreground mb-1">💬 Exempel:</div>
                      <div className="text-sm font-mono bg-background rounded px-3 py-2 border">
                        "{instruction.example}"
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground italic bg-blue-50/50 dark:bg-blue-950/20 rounded px-2 py-1">
                      💡 {instruction.details}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-lg p-4 space-y-3 border border-blue-200/30 dark:border-blue-800/30">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900">
                💡 Smarta Tips
              </Badge>
            </div>
            <div className="text-sm space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span><strong>Prata naturligt</strong> - "Jag köpte kaffe för 45 kr" fungerar perfekt</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span><strong>AI:n frågar efter det som saknas</strong> - belopp, beskrivning, datum</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span><strong>Använd mikrofon eller text</strong> - båda fungerar lika bra</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">📋</span>
                <span><strong>Skapa egna mallar</strong> för återkommande, specifika transaktioner</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400">🤖</span>
                <span><strong>Fråga AI:n</strong> - "Vilket konto ska jag använda för detta?"</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200/30 dark:border-amber-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-300">
                🎯 När AI:n inte känner igen transaktionen
              </Badge>
            </div>
            <div className="text-sm space-y-1 text-amber-800 dark:text-amber-200">
              <div>• AI:n bokför transaktionen manuellt baserat på BAS-kontoplanen</div>
              <div>• AI:n kan föreslå att du skapar en egen mall för framtida liknande transaktioner</div>
              <div>• Gå till <strong>Mallar-sidan</strong> för att skapa anpassade mallar själv</div>
              <div>• Dina mallar blir tillgängliga för framtida användning</div>
              <div>• Systemmallar används för vanliga transaktioner (skatt, lön, etc.)</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceInstructions;
