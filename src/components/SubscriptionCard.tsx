import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Crown, Sparkles, Check } from "lucide-react";

interface SubscriptionCardProps {
  subscription?: {
    subscribed: boolean;
    subscription_tier: string;
    subscription_end: string | null;
  };
  usage?: {
    ai_analyses_used: number;
    storage_used_mb: number;
    month_year: string;
  };
  onRefresh?: () => void;
}

const TIER_LIMITS = {
  free: { ai_analyses: 50, storage_mb: 500 },
  premium: { ai_analyses: 500, storage_mb: 5000 },
  professional: { ai_analyses: -1, storage_mb: 50000 }
};

const TIER_PRICES = {
  premium: { price: 99, currency: "SEK" },
  professional: { price: 199, currency: "SEK" }
};

export default function SubscriptionCard({ subscription, usage, onRefresh }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const currentTier = subscription?.subscription_tier || 'free';
  const limits = TIER_LIMITS[currentTier as keyof typeof TIER_LIMITS];
  
  const aiUsagePercent = limits.ai_analyses === -1 ? 0 : 
    Math.min(100, ((usage?.ai_analyses_used || 0) / limits.ai_analyses) * 100);
  
  const storageUsagePercent = Math.min(100, ((usage?.storage_used_mb || 0) / limits.storage_mb) * 100);

  const handleUpgrade = async (tier: 'premium' | 'professional') => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier }
      });

      if (error) throw error;
      
      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Fel",
        description: "Kunde inte starta betalning. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Fel",
        description: "Kunde inte öppna prenumerationshantering. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium': return <Crown className="h-4 w-4" />;
      case 'professional': return <Sparkles className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return "bg-gradient-to-r from-amber-500 to-yellow-500";
      case 'professional': return "bg-gradient-to-r from-purple-500 to-pink-500";
      default: return "bg-gradient-to-r from-blue-500 to-cyan-500";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${getTierColor(currentTier)} text-white`}>
              {getTierIcon(currentTier)}
            </div>
            <div>
              <CardTitle className="capitalize">{currentTier} Plan</CardTitle>
              <CardDescription>
                {subscription?.subscription_end && 
                  `Gäller till ${new Date(subscription.subscription_end).toLocaleDateString('sv-SE')}`
                }
              </CardDescription>
            </div>
          </div>
          <Badge variant={subscription?.subscribed ? "default" : "secondary"}>
            {subscription?.subscribed ? "Aktiv" : "Gratis"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Usage Stats */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>AI-analyser denna månad</span>
              <span className="font-medium">
                {usage?.ai_analyses_used || 0} / {limits.ai_analyses === -1 ? '∞' : limits.ai_analyses}
              </span>
            </div>
            <Progress value={aiUsagePercent} className="h-2" />
          </div>
          
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Lagringsutrymme</span>
              <span className="font-medium">
                {Math.round(usage?.storage_used_mb || 0)} MB / {Math.round(limits.storage_mb)} MB
              </span>
            </div>
            <Progress value={storageUsagePercent} className="h-2" />
          </div>
        </div>

        {/* Plan Features */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Inkluderat i din plan:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-3 w-3 text-green-500" />
              <span>{limits.ai_analyses === -1 ? 'Obegränsade' : limits.ai_analyses} AI-analyser/månad</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3 w-3 text-green-500" />
              <span>{Math.round(limits.storage_mb / 1000)} GB lagring</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3 w-3 text-green-500" />
              <span>Obegränsade manuella transaktioner</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3 w-3 text-green-500" />
              <span>
                {currentTier === 'professional' ? 'Prioriterad support' : 
                 currentTier === 'premium' ? 'Standard support' : 'Community support'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {currentTier === 'free' && (
            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={() => handleUpgrade('premium')} 
                disabled={loading}
                className="w-full"
              >
                Uppgradera till Premium - {TIER_PRICES.premium.price} {TIER_PRICES.premium.currency}/mån
              </Button>
              <Button 
                onClick={() => handleUpgrade('professional')} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Uppgradera till Professional - {TIER_PRICES.professional.price} {TIER_PRICES.professional.currency}/mån
              </Button>
            </div>
          )}
          
          {currentTier === 'premium' && (
            <div className="space-y-2">
              <Button 
                onClick={() => handleUpgrade('professional')} 
                disabled={loading}
                className="w-full"
              >
                Uppgradera till Professional - {TIER_PRICES.professional.price} {TIER_PRICES.professional.currency}/mån
              </Button>
              <Button 
                onClick={handleManageSubscription} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Hantera prenumeration
              </Button>
            </div>
          )}
          
          {currentTier === 'professional' && (
            <Button 
              onClick={handleManageSubscription} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Hantera prenumeration
            </Button>
          )}
          
          <Button 
            onClick={onRefresh} 
            disabled={loading}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            Uppdatera status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}