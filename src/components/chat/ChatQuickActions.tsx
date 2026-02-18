import { useMemo } from "react";
import { ActiveTrigger } from "@/hooks/useQuickActionContext";

interface ChatQuickActionsProps {
  onAction: (message: string) => void;
  isLoading: boolean;
  hasMessages: boolean;
  lastMessageIsBooking?: boolean;
  transactionCount?: number;
  hasOpeningBalances?: boolean;
  topTemplates?: { name: string; count: number }[];
  activeTriggers?: ActiveTrigger[];
}

interface QuickAction {
  label: string;
  message: string;
  prominent?: boolean;
}

const ChatQuickActions = ({
  onAction,
  isLoading,
  hasMessages,
  lastMessageIsBooking = false,
  transactionCount = -1,
  hasOpeningBalances = false,
  topTemplates = [],
  activeTriggers = [],
}: ChatQuickActionsProps) => {
  const actions = useMemo<QuickAction[]>(() => {
    // 1. POST-BOOKING
    if (lastMessageIsBooking) {
      return [
        { label: "Bokför en till", message: "Jag vill bokföra en ny transaktion" },
        { label: "Visa saldo", message: "Visa saldo på checkkontot" },
      ];
    }

    // 2. ONBOARDING (no IB, no transactions)
    if (transactionCount === 0 && !hasOpeningBalances) {
      return [
        { label: "Lägg in IB", message: "Jag vill lägga in ingående balanser", prominent: true },
        { label: "Bokför första utgiften", message: "Jag vill bokföra min första utgift" },
        { label: "Hur funkar det?", message: "Hur fungerar AirLedger?" },
      ];
    }

    const items: QuickAction[] = [];

    // 3. DEADLINE-DRIVEN (from database triggers)
    activeTriggers.slice(0, 2).forEach(t => {
      items.push({
        label: t.label,
        message: t.message,
        prominent: t.prominent,
      });
    });

    // 4. PERSONALIZED (top template)
    if (topTemplates.length > 0 && items.length < 4) {
      items.push({
        label: topTemplates[0].name,
        message: `Bokför ${topTemplates[0].name.toLowerCase()}`,
      });
    }

    // 5. DEFAULT fallbacks
    if (items.length === 0) {
      items.push({ label: "Bokför utgift", message: "Jag vill bokföra en utgift" });
    }

    if (items.length < 4) {
      items.push({ label: "Kontosaldo", message: "Visa saldo på checkkontot (1930)" });
    }
    if (items.length < 5) {
      items.push({ label: "Avstämning", message: "Gör en periodavstämning" });
    }

    return items.slice(0, 5);
  }, [lastMessageIsBooking, transactionCount, hasOpeningBalances, topTemplates, activeTriggers]);

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.message)}
          disabled={isLoading}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 disabled:opacity-50 ${
            action.prominent
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default ChatQuickActions;
