import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Receipt, FileText, Calculator, Banknote } from "lucide-react";

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: Receipt,
      label: "Lägg till utgift",
      description: "Registrera kvitto eller utgift",
      action: () => {
        navigate("/chat");
        setIsOpen(false);
      }
    },
    {
      icon: FileText,
      label: "Skapa faktura",
      description: "Fakturera en kund",
      action: () => {
        navigate("/chat");
        setIsOpen(false);
      }
    },
    {
      icon: Banknote,
      label: "Registrera inbetalning",
      description: "Markera faktura som betald",
      action: () => {
        navigate("/chat");
        setIsOpen(false);
      }
    },
    {
      icon: Calculator,
      label: "Ingående balans",
      description: "Sätt startbalans för konto",
      action: () => {
        navigate("/opening-balances");
        setIsOpen(false);
      }
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full bg-primary shadow-xl hover:shadow-2xl z-40 transition-all duration-200 hover:scale-105"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto rounded-t-xl border-0">
        <SheetHeader className="pb-4">
          <SheetTitle>Snabbåtgärder</SheetTitle>
        </SheetHeader>
        <div className="grid gap-3 pb-6">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              className="h-auto p-4 justify-start text-left"
              onClick={action.action}
            >
              <action.icon className="h-5 w-5 mr-3 text-primary" />
              <div>
                <div className="font-medium">{action.label}</div>
                <div className="text-sm text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FloatingActionButton;