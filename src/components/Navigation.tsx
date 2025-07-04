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
        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
          active 
            ? 'bg-primary/10 text-primary font-medium' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        } ${mobile ? 'w-full' : ''}`}
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

  return (
    <>
      {/* Clean Header with Drawer Menu */}
      <header className="sticky top-0 z-40 w-full border-b border-border/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between px-6 max-w-none">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-semibold text-sm">
              AL
            </div>
            <h1 className="text-lg font-medium text-foreground">Air Ledger</h1>
          </div>
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background border-l border-border/20">
              <div className="flex flex-col gap-8 pt-8">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-medium text-sm">AL</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Ditt företag</p>
                    <p className="text-sm text-muted-foreground">556xxx-xxxx</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {navigationItems.map((item) => (
                    <NavLink key={item.href} item={item} mobile />
                  ))}
                </div>
                
                <div className="border-t border-border/20 pt-4">
                  <Button variant="ghost" className="w-full justify-start h-10 px-3">
                    <Settings className="h-4 w-4 mr-3" />
                    Inställningar
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
};

export default Navigation;