import { useMemo } from "react";

interface ChatQuickActionsProps {
  onAction: (message: string) => void;
  isLoading: boolean;
  hasMessages: boolean;
  lastMessageIsBooking?: boolean;
}

interface QuickAction {
  label: string;
  message: string;
  prominent?: boolean;
}

function getCurrentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

function getPreviousQuarter(): { q: number; year: number } {
  const now = new Date();
  const currentQ = Math.floor(now.getMonth() / 3) + 1;
  if (currentQ === 1) return { q: 4, year: now.getFullYear() - 1 };
  return { q: currentQ - 1, year: now.getFullYear() };
}

function isQuarterStart(): boolean {
  const month = new Date().getMonth();
  return month % 3 === 0; // Jan, Apr, Jul, Oct
}

function isYearStart(): boolean {
  const month = new Date().getMonth();
  return month <= 1; // Jan or Feb
}

const ChatQuickActions = ({
  onAction,
  isLoading,
  hasMessages,
  lastMessageIsBooking = false,
}: ChatQuickActionsProps) => {
  const actions = useMemo<QuickAction[]>(() => {
    if (lastMessageIsBooking) {
      return [
        { label: "Bokför en till", message: "Jag vill bokföra en ny transaktion" },
        { label: "Visa saldo", message: "Visa saldo på checkkontot" },
      ];
    }

    const items: QuickAction[] = [
      { label: "Bokför utgift", message: "Jag vill bokföra en utgift" },
    ];

    // Prominent VAT button at quarter start
    if (isQuarterStart()) {
      const prev = getPreviousQuarter();
      items.unshift({
        label: `Momsrapport Q${prev.q}`,
        message: `Visa momsrapport för Q${prev.q} ${prev.year}`,
        prominent: true,
      });
    } else {
      items.push({
        label: `Momsrapport Q${getCurrentQuarter()}`,
        message: `Visa momsrapport för innevarande kvartal`,
      });
    }

    items.push({ label: "Kontosaldo", message: "Visa saldo på checkkontot (1930)" });
    items.push({ label: "Avstämning", message: "Gör en periodavstämning" });

    // Year-end button in Jan/Feb
    if (isYearStart()) {
      const prevYear = new Date().getFullYear() - 1;
      items.push({
        label: `Bokslut ${prevYear}`,
        message: `Påbörja årsbokslut för ${prevYear}`,
        prominent: true,
      });
    }

    return items;
  }, [lastMessageIsBooking]);

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
