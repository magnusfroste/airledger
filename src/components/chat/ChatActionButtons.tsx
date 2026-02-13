import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ChatActionButtonsProps {
  onAction: (message: string) => void;
}

const ChatActionButtons = ({ onAction }: ChatActionButtonsProps) => {
  return (
    <div className="flex gap-2 mt-2 ml-1">
      <Button
        variant="success"
        size="sm"
        className="rounded-full px-4 h-8 text-xs font-medium"
        onClick={() => onAction("Ja, bokför detta")}
      >
        <Check className="h-3.5 w-3.5" />
        Bokför
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-full px-4 h-8 text-xs font-medium text-muted-foreground"
        onClick={() => onAction("Nej, avbryt")}
      >
        <X className="h-3.5 w-3.5" />
        Avbryt
      </Button>
    </div>
  );
};

export default ChatActionButtons;
