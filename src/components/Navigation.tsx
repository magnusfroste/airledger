import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  MessageCircle, 
  FileText, 
  Menu,
  Bell,
  Settings
} from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { 
      href: "/", 
      label: "Dashboard", 
      icon: Home,
      badge: null
    },
    { 
      href: "/chat", 
      label: "AI-Chat", 
      icon: MessageCircle,
      badge: null
    },
    { 
      href: "/transactions", 
      label: "Transaktioner", 
      icon: FileText,
      badge: "3"
    },
  ];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const NavLink = ({ item, mobile = false }: { item: typeof navigationItems[0], mobile?: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    return (
      <Link
        to={item.href}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          active 
            ? 'bg-gradient-primary text-primary-foreground shadow-soft' 
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
        } ${mobile ? 'w-full' : ''}`}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{item.label}</span>
        {item.badge && (
          <Badge 
            variant={active ? "secondary" : "outline"}
            className="ml-auto text-xs"
          >
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Navigation - Hidden on mobile */}
      <nav className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-50">
        <div className="bg-surface/95 backdrop-blur border border-border/50 rounded-2xl shadow-large p-2">
          <div className="flex flex-col gap-1">
            {navigationItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur border-t border-border/50">
        <div className="flex items-center justify-around p-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 flex-1 ${
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
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Header with Menu */}
      <header className="md:hidden sticky top-0 z-40 w-full border-b border-border/40 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-bold text-lg">
              AL
            </div>
            <h1 className="text-xl font-semibold text-foreground">Air Ledger</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-primary" />
                    <div>
                      <p className="font-medium text-foreground">Ditt företag</p>
                      <p className="text-sm text-muted-foreground">Organisationsnummer: 556xxx-xxxx</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Navigation
                    </h3>
                    {navigationItems.map((item) => (
                      <NavLink key={item.href} item={item} mobile />
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Inställningar
                    </h3>
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-3" />
                      Inställningar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Add bottom padding to main content on mobile to account for bottom nav */}
      <div className="md:hidden h-20" />
    </>
  );
};

export default Navigation;