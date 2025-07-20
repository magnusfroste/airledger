
import Dashboard from "@/components/Dashboard";
import LandingPage from "@/components/LandingPage";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // Desktop/tablet layout with sidebar
    if (!isMobile) {
      return (
        <div className="min-h-screen bg-background">
          <Navigation />
          <main className="ml-64 min-h-screen">
            <Dashboard />
          </main>
        </div>
      );
    }

    // Mobile layout
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="min-h-[calc(100vh-112px)]">
          <Dashboard />
        </main>
      </div>
    );
  }

  return <LandingPage />;
};

export default Index;
