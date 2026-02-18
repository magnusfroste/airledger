import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveTrigger {
  label: string;
  message: string;
  priority: number;
  daysUntilDeadline: number;
  prominent: boolean;
}

interface QuickActionContext {
  transactionCount: number;
  hasOpeningBalances: boolean;
  topTemplates: { name: string; count: number }[];
  activeTriggers: ActiveTrigger[];
  fiscalYearStart: number;
  isLoading: boolean;
}

function getNextOccurrence(month: number, day: number, fiscalYearStart: number, relativeTofiscalYear: boolean): Date {
  const now = new Date();
  const thisYear = now.getFullYear();

  let adjustedMonth = month;
  if (relativeTofiscalYear && fiscalYearStart !== 1) {
    // Shift trigger month by the fiscal year offset
    // E.g. Årsredovisning is month=2 (Feb) for calendar year.
    // For fiscal year starting Jul (7), offset = 6, so 2+6 = 8 (Aug).
    const offset = fiscalYearStart - 1;
    adjustedMonth = ((month - 1 + offset) % 12) + 1;
  }

  let next = new Date(thisYear, adjustedMonth - 1, day);
  if (next <= now) next = new Date(thisYear + 1, adjustedMonth - 1, day);
  return next;
}

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function useQuickActionContext(): QuickActionContext {
  const { user } = useAuth();
  const [data, setData] = useState<QuickActionContext>({
    transactionCount: -1,
    hasOpeningBalances: false,
    topTemplates: [],
    activeTriggers: [],
    fiscalYearStart: 1,
    isLoading: true,
  });

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        // Parallel queries
        const [txRes, ibRes, tmplRes, trigRes, profileRes] = await Promise.all([
          supabase
            .from('airledger_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('airledger_opening')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('airledger_template_usage')
            .select('template_name')
            .eq('user_id', user.id)
            .order('used_at', { ascending: false })
            .limit(50),
          supabase
            .from('air_triggers' as any)
            .select('*')
            .eq('is_active', true),
          supabase
            .from('profiles')
            .select('fiscal_year_start')
            .eq('id', user.id)
            .single(),
        ]);

        const fiscalYearStart = (profileRes.data as any)?.fiscal_year_start ?? 1;

        // Count top templates
        const templateCounts: Record<string, number> = {};
        (tmplRes.data || []).forEach((row: any) => {
          templateCounts[row.template_name] = (templateCounts[row.template_name] || 0) + 1;
        });
        const topTemplates = Object.entries(templateCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }));

        // Calculate active triggers
        const now = new Date();
        const activeTriggers: ActiveTrigger[] = [];
        ((trigRes.data || []) as any[]).forEach((t) => {
          const next = getNextOccurrence(t.month, t.day, fiscalYearStart, t.relative_to_fiscal_year ?? false);
          const days = daysUntil(next);
          if (days <= t.days_before) {
            activeTriggers.push({
              label: t.quick_action_label,
              message: t.quick_action_message,
              priority: t.priority,
              daysUntilDeadline: days,
              prominent: days <= 7,
            });
          }
        });
        activeTriggers.sort((a, b) => b.priority - a.priority);

        setData({
          transactionCount: txRes.count ?? 0,
          hasOpeningBalances: (ibRes.count ?? 0) > 0,
          topTemplates,
          activeTriggers,
          fiscalYearStart,
          isLoading: false,
        });
      } catch (e) {
        console.error('useQuickActionContext error:', e);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    };

    load();
  }, [user]);

  return data;
}
