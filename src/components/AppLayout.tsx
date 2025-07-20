
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
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Home, Bot, FileText, MoreHorizontal, Settings, LogOut, User, BarChart3, Calculator, BookOpen } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [isDeveloper, setIsDeveloper] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsMobileMenuOpen(false);
      toast({
        title: "Utloggad",
        description: "Du har loggats ut framgångsrikt.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Fel",
        description: "Kunde inte logga ut. Försök igen.",
        variant: "destructive",
      });
    }
  };

  const bottomTabItems = [
    { 
      href: "/", 
      label: "Hem", 
      icon: Home,
      badge: null
    },
    { 
      href: "/chat", 
      label: "Air", 
      icon: Bot,
      badge: null
    },
    { 
      href: "/transactions", 
      label: "Transaktioner", 
      icon: FileText,
      badge: transactionCount > 0 ? transactionCount.toString() : null
    },
    { 
      href: "/reports", 
      label: "Rapporter", 
      icon: BarChart3,
      badge: null
    }
  ];

  const moreMenuItems = [
    { 
      href: "/general-ledger", 
      label: "Huvudbok", 
      icon: BookOpen,
      badge: null
    },
    { 
      href: "/opening-balances", 
      label: "Ingående balanser", 
      icon: Calculator,
      badge: null
    },
    { 
      href: "/balance-sheet", 
      label: "Balansrapport", 
      icon: BarChart3,
      badge: null
    },
    { 
      href: "/templates", 
      label: "Mallar", 
      icon: Settings,
      badge: null
    },
    { 
      href: "/subscription", 
      label: "Prenumeration", 
      icon: User,
      badge: null
    },
  ];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const BottomTabLink = ({ item }: { item: typeof bottomTabItems[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    return (
      <Link
        to={item.href}
        className={`flex flex-col items-center gap-1 py-2 px-3 transition-colors duration-200 ${
          active 
            ? 'text-primary' 
            : 'text-muted-foreground'
        }`}
      >
        <div className="relative">
          <Icon className="h-5 w-5" />
          {item.badge && (
            <Badge 
              variant="destructive"
              className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
            >
              {item.badge}
            </Badge>
          )}
        </div>
        <span className="text-xs font-medium">{item.label}</span>
      </Link>
    );
  };

  const MoreMenuLink = ({ item }: { item: typeof moreMenuItems[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    return (
      <Link
        to={item.href}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-4 h-12 rounded-xl transition-all duration-200 ${
          active 
            ? 'bg-primary/10 text-primary font-medium' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        } w-full`}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{item.label}</span>
        {item.badge && (
          <Badge 
            variant="secondary"
            className="ml-auto text-xs h-5 px-2 bg-muted text-muted-foreground"
          >
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  // For mobile, return children with bottom navigation
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

        {/* Bottom Tab Navigation with iOS safe area */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border/20 pb-safe">
          <div className="flex items-center justify-around px-2 py-2">
            {bottomTabItems.map((item) => (
              <BottomTabLink key={item.href} item={item} />
            ))}
            
            {/* More Menu Tab */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className={`flex flex-col items-center gap-1 py-2 px-3 transition-colors duration-200 ${
                    moreMenuItems.some(item => isActive(item.href)) || isActive('/settings')
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`}
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-xs font-medium">Mer</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto rounded-t-xl border-0">
                <div className="flex flex-col gap-6 py-4">
                  {/* User Profile Section */}
                  <div className="flex items-center gap-4 px-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
                      <User className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Användare'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  
                  {/* More Menu Items */}
                  <div className="space-y-1">
                    {moreMenuItems.map((item) => (
                      <MoreMenuLink key={item.href} item={item} />
                    ))}
                  </div>
                  
                  {/* Settings & Sign Out */}
                  <div className="border-t border-border/20 pt-4 space-y-1">
                    <Link 
                      to="/settings" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 h-12 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full"
                    >
                      <Settings className="h-5 w-5" />
                      <span className="font-medium">Inställningar</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 h-12 rounded-xl transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Logga ut</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
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
