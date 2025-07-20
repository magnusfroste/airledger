
import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import VoiceInstructions from "@/components/VoiceInstructions";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [isDeveloper, setIsDeveloper] = useState<boolean>(false);

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Fetch dynamic data for navigation
  useEffect(() => {
    const fetchNavigationData = async () => {
      if (!user) return;
      
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
      }
    };

    fetchNavigationData();
  }, [user]);

  // For mobile, return children without sidebar
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 w-full border-b border-border/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-12 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-semibold text-xs">
                AL
              </div>
              <h1 className="text-base font-medium text-foreground">AirLedger</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {location.pathname === '/chat' && <VoiceInstructions />}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="min-h-[calc(100vh-112px)] pb-20">
          {children}
        </main>

        {/* Mobile bottom navigation - this will be added later */}
      </div>
    );
  }

  // Desktop/tablet layout with sidebar
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar transactionCount={transactionCount} isDeveloper={isDeveloper} />
        <SidebarInset>
          <header className="sticky top-0 z-40 w-full border-b border-border/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex h-12 items-center justify-between px-4">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                {location.pathname === '/chat' && <VoiceInstructions />}
              </div>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
