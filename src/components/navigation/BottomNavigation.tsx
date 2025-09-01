import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Home, Bot, FileText, BarChart3, MoreHorizontal } from "lucide-react";

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
}

interface BottomNavigationProps {
  transactionCount: number;
  moreMenuItems: NavigationItem[];
  isMoreMenuOpen: boolean;
  setIsMoreMenuOpen: (open: boolean) => void;
  moreMenuContent: React.ReactNode;
}

const BottomNavigation = ({ 
  transactionCount, 
  moreMenuItems, 
  isMoreMenuOpen, 
  setIsMoreMenuOpen, 
  moreMenuContent 
}: BottomNavigationProps) => {
  const location = useLocation();

  const bottomTabItems: NavigationItem[] = [
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

  const isActive = (href: string) => location.pathname === href;

  const BottomTabLink = ({ item }: { item: NavigationItem }) => {
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border/20 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {bottomTabItems.map((item) => (
          <BottomTabLink key={item.href} item={item} />
        ))}
        
        {/* More Menu Tab */}
        <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-colors duration-200 ${
                moreMenuItems.some(item => isActive(item.href))
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium">Mer</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-xl border-0">
            {moreMenuContent}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default BottomNavigation;