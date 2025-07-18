import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface UserPreferences {
  showAccountNumbers: boolean;
  accountingExperience: 'beginner' | 'intermediate' | 'advanced';
  industry: string | null;
  accountingMethod: 'cash' | 'accrual';
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>;
  loading: boolean;
}

const defaultPreferences: UserPreferences = {
  showAccountNumbers: false, // Default to false for beginner-friendly experience
  accountingExperience: 'beginner',
  industry: null,
  accountingMethod: 'accrual', // Default to accrual accounting
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserPreferences();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Extract preferences from profile or use defaults
        const userPrefs: UserPreferences = {
          showAccountNumbers: profile.show_account_numbers ?? defaultPreferences.showAccountNumbers,
          accountingExperience: (['beginner', 'intermediate', 'advanced'].includes(profile.accounting_experience)) 
            ? profile.accounting_experience as 'beginner' | 'intermediate' | 'advanced'
            : defaultPreferences.accountingExperience,
          industry: profile.industry ?? defaultPreferences.industry,
          accountingMethod: (['cash', 'accrual'].includes(profile.accounting_method))
            ? profile.accounting_method as 'cash' | 'accrual'
            : defaultPreferences.accountingMethod,
        };
        setPreferences(userPrefs);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!user) return;

    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    try {
      await supabase
        .from('profiles')
        .update({
          show_account_numbers: updatedPreferences.showAccountNumbers,
          accounting_experience: updatedPreferences.accountingExperience,
          industry: updatedPreferences.industry,
          accounting_method: updatedPreferences.accountingMethod,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      // Revert on error
      setPreferences(preferences);
      throw error;
    }
  };

  return (
    <UserPreferencesContext.Provider value={{
      preferences,
      updatePreferences,
      loading,
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}