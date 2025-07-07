import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string;
  subscription_end: string | null;
}

interface UsageData {
  ai_analyses_used: number;
  storage_used_mb: number;
  month_year: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSubscriptionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check subscription status with Stripe
      const { data: subData, error: subError } = await supabase.functions.invoke('check-subscription');
      
      if (subError) {
        console.error('Subscription check error:', subError);
        // Don't throw here, set default values instead
        setSubscription({
          subscribed: false,
          subscription_tier: 'free',
          subscription_end: null
        });
      } else {
        setSubscription(subData);
      }

      // Get current usage data
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('ai_analyses_used, storage_used_mb, month_year')
        .eq('user_id', user.id)
        .eq('month_year', monthYear)
        .single();

      if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Usage fetch error:', usageError);
      }

      setUsage(usageData || {
        ai_analyses_used: 0,
        storage_used_mb: 0,
        month_year: monthYear
      });

    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Set default values on error
      setSubscription({
        subscribed: false,
        subscription_tier: 'free',
        subscription_end: null
      });
      setUsage({
        ai_analyses_used: 0,
        storage_used_mb: 0,
        month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  // Auto-refresh every 30 seconds when on the page
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchSubscriptionData();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return {
    subscription,
    usage,
    loading,
    error,
    refresh: fetchSubscriptionData
  };
}