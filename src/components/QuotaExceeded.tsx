
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Crown, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface QuotaExceededProps {
  subscriptionTier: string;
  usage?: {
    ai_analyses_used: number;
    storage_used_mb: number;
  };
  onDismiss?: () => void;
}

const TIER_LIMITS = {
  free: { ai_analyses: 50, storage_mb: 500 },
  premium: { ai_analyses: 500, storage_mb: 5000 },
  professional: { ai_analyses: -1, storage_mb: 50000 }
};

export default function QuotaExceeded({ subscriptionTier, usage, onDismiss }: QuotaExceededProps) {
  const limits = TIER_LIMITS[subscriptionTier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;
  
  const aiUsagePercent = limits.ai_analyses === -1 ? 0 : 
    Math.min(100, (usage?.ai_analyses_used || 0) / limits.ai_analyses * 100);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
  const resetDate = nextMonth.toLocaleDateString('sv-SE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" />
          AI-analyskvoter överskridna
        </CardTitle>
        <CardDescription className="text-red-600 dark:text-red-400">
          Du har använt alla dina AI-analyser för denna månad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usage && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>AI-analyser använt:</span>
              <span className="font-medium">
                {usage.ai_analyses_used}/{limits.ai_analyses === -1 ? '∞' : limits.ai_analyses}
              </span>
            </div>
            <Progress value={aiUsagePercent} className="h-2" />
          </div>
        )}

        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <strong>Kvoten återställs:</strong> {resetDate}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Vad kan du göra nu?
          </p>
          
          <div className="space-y-2">
            {subscriptionTier === 'free' && (
              <Button size="sm" className="w-full" asChild>
                <Link to="/subscription">
                  <Crown className="h-4 w-4 mr-2" />
                  Uppgradera till Premium (500 analyser/månad)
                </Link>
              </Button>
            )}
            
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>• Ladda upp kvitton för manuell analys</p>
              <p>• Använd mallfunktionen för vanliga transaktioner</p>
              <p>• Bokför transaktioner manuellt via Dashboard</p>
            </div>
          </div>
        </div>

        {onDismiss && (
          <Button variant="outline" size="sm" onClick={onDismiss} className="w-full">
            Fortsätt utan AI-analys
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
