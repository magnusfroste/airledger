import { Info, X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const VoiceInstructions = () => {
  const [isOpen, setIsOpen] = useState(false);

  const instructions = [
    {
      title: "🧾 Ingående balanser",
      description: "Registrera startbalans för dina konton",
      example: "Jag har 50 000 kr på checkkonto 1930",
      details: "AI:n förstår automatiskt om det ska vara debet eller kredit baserat på kontotyp"
    },
    {
      title: "📄 Utgående fakturor",
      description: "När du fakturerar en kund",
      example: "Jag har fakturerat Företag AB 25 000 kr för webbutveckling",
      details: "Bokförs automatiskt: Debet 1510 Kundfordringar, Kredit 3000 Försäljning"
    },
    {
      title: "🧾 Inkommande kvitton",
      description: "Ladda upp bild av kvitto för automatisk analys",
      example: "Fota ditt kvitto och ladda upp",
      details: "AI:n analyserar och föreslår korrekt kontering"
    },
    {
      title: "💬 Allmänna frågor",
      description: "Ställ frågor om bokföring och BAS-kontoplanen",
      example: "Vilket konto ska jag använda för kontorsmaterial?",
      details: "AI:n hjälper dig med svensk bokföring och debet/kredit"
    }
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
      >
        <Info className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">
                🗣️ Så här pratar du med AI-assistenten
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground mb-4">
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
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default VoiceInstructions;