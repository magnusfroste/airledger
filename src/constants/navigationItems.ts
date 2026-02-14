import { BookOpen, Calculator, BarChart3, Settings, User, Shield } from "lucide-react";

export interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
}

export const getMoreMenuItems = (): NavigationItem[] => [
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
  { 
    href: "/admin", 
    label: "Admin", 
    icon: Shield,
    badge: null
  },
];