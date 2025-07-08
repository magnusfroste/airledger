import Dashboard from "@/components/Dashboard";
import LandingPage from "@/components/LandingPage";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, loading } = useAuth();

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
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="h-[calc(100vh-48px-64px)] pb-2"> {/* Full height minus header and bottom nav */}
          <Dashboard />
        </main>
      </div>
    );
  }

  return <LandingPage />;
};

export default Index;
