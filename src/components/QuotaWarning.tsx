import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown } from "lucide-react";
import { Link } from "react-router-dom";

interface QuotaWarningProps {
  subscriptionTier: string;
  usage?: {
    ai_analyses_used: number;
    storage_used_mb: number;
  };
}

const TIER_LIMITS = {
  free: { ai_analyses: 50, storage_mb: 500 },
  premium: { ai_analyses: 500, storage_mb: 5000 },
  professional: { ai_analyses: -1, storage_mb: 50000 }
};

export default function QuotaWarning({ subscriptionTier, usage }: QuotaWarningProps) {
  const limits = TIER_LIMITS[subscriptionTier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
  
  if (!usage) return null;
  
  const aiUsagePercent = limits.ai_analyses === -1 ? 0 : 
    (usage.ai_analyses_used / limits.ai_analyses) * 100;
  
  const storageUsagePercent = (usage.storage_used_mb / limits.storage_mb) * 100;
  
  // Show warning if at 80% or above
  const showAiWarning = aiUsagePercent >= 80;
  const showStorageWarning = storageUsagePercent >= 80;
  
  if (!showAiWarning && !showStorageWarning) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <span className="font-medium">
            {showAiWarning && showStorageWarning ? 
              "AI-analyser och lagringsutrymme närmar sig gränsen" :
              showAiWarning ? 
                `AI-analyser: ${usage.ai_analyses_used}/${limits.ai_analyses}` :
                `Lagring: ${Math.round(usage.storage_used_mb)}/${Math.round(limits.storage_mb)} MB`
            }
          </span>
          {subscriptionTier === 'free' && (
            <span className="ml-2 text-sm text-muted-foreground">
              Uppgradera för större kvoter
            </span>
          )}
        </div>
        {subscriptionTier === 'free' && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/subscription">
              <Crown className="h-3 w-3 mr-1" />
              Uppgradera
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}