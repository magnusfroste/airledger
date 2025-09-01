import { useLocation } from "react-router-dom";
import VoiceInstructions from "@/components/VoiceInstructions";

const NavigationHeader = () => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-semibold text-xs">
            AL
          </div>
          <h1 className="text-base font-medium text-foreground">AirLedger</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {location.pathname === '/chat' && <VoiceInstructions />}
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;