
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Home, Bot, FileText, BarChart3, BookOpen, Calculator, Settings, LogOut, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  transactionCount: number;
  isDeveloper: boolean;
}

const AppSidebar = ({ transactionCount, isDeveloper }: AppSidebarProps) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { state } = useSidebar();

  const handleSignOut = async () => {
    try {
      await signOut();
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

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  // Main navigation items
  const mainItems = [
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

  // Secondary navigation items
  const secondaryItems = [
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

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-border/20">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-semibold text-sm">
            AL
          </div>
          {!isCollapsed && <h1 className="text-lg font-semibold text-foreground">AirLedger</h1>}
        </div>
        <SidebarTrigger className="mt-2" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Huvudmeny</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={isCollapsed ? item.label : undefined}>
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.label}</span>}
                      {item.badge && !isCollapsed && (
                        <Badge 
                          variant="destructive"
                          className="ml-auto h-5 px-2 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Verktyg</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={isCollapsed ? item.label : undefined}>
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.label}</span>}
                      {item.badge && !isCollapsed && (
                        <Badge 
                          variant="secondary"
                          className="ml-auto h-5 px-2 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">
                {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Användare'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        )}
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip={isCollapsed ? "Inställningar" : undefined}>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                {!isCollapsed && <span>Inställningar</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip={isCollapsed ? "Logga ut" : undefined}>
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Logga ut</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
