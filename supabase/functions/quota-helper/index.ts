import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface QuotaLimits {
  ai_analyses: number;
  storage_mb: number;
}

export const TIER_LIMITS: Record<string, QuotaLimits> = {
  free: { ai_analyses: 50, storage_mb: 500 },
  premium: { ai_analyses: 500, storage_mb: 5000 },
  professional: { ai_analyses: -1, storage_mb: 50000 } // -1 means unlimited
};

export async function checkAndUpdateQuota(
  userId: string, 
  supabase: any,
  incrementAiAnalyses: boolean = false
): Promise<{ allowed: boolean; subscription_tier: string; usage: any }> {
  try {
    // Get current month-year
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get user subscription
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single();

    const subscriptionTier = subscriber?.subscription_tier || 'free';
    const limits = TIER_LIMITS[subscriptionTier];

    // Get or create usage record
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();

    let currentUsage = usage;
    if (!currentUsage) {
      // Create new usage record
      const { data: newUsage, error: createError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          month_year: monthYear,
          ai_analyses_used: 0,
          storage_used_mb: 0
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating usage record:', createError);
        return { allowed: false, subscription_tier: subscriptionTier, usage: null };
      }
      currentUsage = newUsage;
    }

    // Check if AI analyses are within quota
    const currentAiAnalyses = currentUsage.ai_analyses_used || 0;
    const aiAnalysesAllowed = limits.ai_analyses === -1 || currentAiAnalyses < limits.ai_analyses;

    if (!aiAnalysesAllowed && incrementAiAnalyses) {
      return { allowed: false, subscription_tier: subscriptionTier, usage: currentUsage };
    }

    // If incrementing, update the usage
    if (incrementAiAnalyses && aiAnalysesAllowed) {
      const { error: updateError } = await supabase
        .from('usage_tracking')
        .update({ 
          ai_analyses_used: currentAiAnalyses + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUsage.id);

      if (updateError) {
        console.error('Error updating usage:', updateError);
        return { allowed: false, subscription_tier: subscriptionTier, usage: currentUsage };
      }
      
      // Update current usage for return
      currentUsage.ai_analyses_used = currentAiAnalyses + 1;
    }

    return { 
      allowed: aiAnalysesAllowed, 
      subscription_tier: subscriptionTier, 
      usage: currentUsage 
    };

  } catch (error) {
    console.error('Error in quota check:', error);
    return { allowed: false, subscription_tier: 'free', usage: null };
  }
}