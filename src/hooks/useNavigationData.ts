import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useNavigationData = () => {
  const { user } = useAuth();
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [isDeveloper, setIsDeveloper] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const fetchTransactionCount = useCallback(async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from('airledger_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (!error && count !== null) {
      setTransactionCount(count);
    }
  }, [user]);

  useEffect(() => {
    const fetchNavigationData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        await fetchTransactionCount();

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_developer')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setIsDeveloper(profile.is_developer || false);
        }
      } catch (error) {
        console.error('Error fetching navigation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNavigationData();

    // Subscribe to transaction changes to keep count updated
    if (user) {
      const channel = supabase
        .channel('nav-transaction-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'airledger_transactions',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchTransactionCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchTransactionCount]);

  return { transactionCount, isDeveloper, loading };
};