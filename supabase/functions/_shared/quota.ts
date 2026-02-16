const TIER_LIMITS: Record<string, { ai_analyses: number }> = {
  free: { ai_analyses: 50 },
  premium: { ai_analyses: 500 },
  professional: { ai_analyses: -1 },
};

export { TIER_LIMITS };

export async function checkAndUpdateQuota(
  userId: string,
  supabase: any,
  increment: boolean = false
): Promise<{ allowed: boolean; subscription_tier: string; usage: any }> {
  try {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single();

    const tier = subscriber?.subscription_tier || 'free';
    const limits = TIER_LIMITS[tier];

    let { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();

    if (!usage) {
      const { data: newUsage, error } = await supabase
        .from('usage_tracking')
        .insert({ user_id: userId, month_year: monthYear, ai_analyses_used: 0, storage_used_mb: 0 })
        .select()
        .single();
      if (error) return { allowed: false, subscription_tier: tier, usage: null };
      usage = newUsage;
    }

    const current = usage.ai_analyses_used || 0;
    const allowed = limits.ai_analyses === -1 || current < limits.ai_analyses;

    if (!allowed && increment) return { allowed: false, subscription_tier: tier, usage };

    if (increment && allowed) {
      await supabase
        .from('usage_tracking')
        .update({ ai_analyses_used: current + 1, updated_at: new Date().toISOString() })
        .eq('id', usage.id);
      usage.ai_analyses_used = current + 1;
    }

    return { allowed, subscription_tier: tier, usage };
  } catch (error) {
    console.error('Quota check error:', error);
    return { allowed: false, subscription_tier: 'free', usage: null };
  }
}
