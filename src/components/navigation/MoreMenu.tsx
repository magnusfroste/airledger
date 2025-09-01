import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut } from "lucide-react";

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
}

interface MoreMenuProps {
  moreMenuItems: NavigationItem[];
  onLinkClick: () => void;
  onSignOut: () => void;
}

const MoreMenu = ({ moreMenuItems, onLinkClick, onSignOut }: MoreMenuProps) => {
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  const MoreMenuLink = ({ item }: { item: NavigationItem }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    return (
      <Link
        to={item.href}
        onClick={onLinkClick}
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

  return (
    <div className="flex flex-col gap-6 py-4">
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
          onClick={onLinkClick}
          className="flex items-center gap-3 px-4 h-12 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full"
        >
          <Settings className="h-5 w-5" />
          <span className="font-medium">Inställningar</span>
        </Link>
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 px-4 h-12 rounded-xl transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logga ut</span>
        </button>
      </div>
    </div>
  );
};

export default MoreMenu;