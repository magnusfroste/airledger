import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useNavigationData = () => {
  const { user } = useAuth();
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [isDeveloper, setIsDeveloper] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNavigationData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch transaction count
        const { data: transactions, error: transError } = await supabase
          .from('airledger_transactions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);
        
        if (!transError && transactions) {
          setTransactionCount(transactions.length);
        }

        // Check if user is developer
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
  }, [user]);

  return { transactionCount, isDeveloper, loading };
};