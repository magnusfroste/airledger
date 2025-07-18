import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import PageLayout from "./components/PageLayout";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import Transactions from "./pages/Transactions";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import BalanceSheet from "./pages/BalanceSheet";
import OpeningBalances from "./pages/OpeningBalances";
import GeneralLedger from "./pages/GeneralLedger";
import Subscription from "./pages/Subscription";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background">
                  <Navigation />
                  <main className="min-h-[calc(100vh-112px)]"> {/* Full height minus header and bottom nav */}
                    <Routes>
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/transactions" element={<PageLayout><Transactions /></PageLayout>} />
                      <Route path="/templates" element={<PageLayout><Templates /></PageLayout>} />
                      <Route path="/settings" element={<PageLayout><Settings /></PageLayout>} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/balance-sheet" element={<PageLayout><BalanceSheet /></PageLayout>} />
                      <Route path="/opening-balances" element={<PageLayout><OpeningBalances /></PageLayout>} />
                      <Route path="/general-ledger" element={<PageLayout><GeneralLedger /></PageLayout>} />
                      <Route path="/subscription" element={<PageLayout><Subscription /></PageLayout>} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<PageLayout><NotFound /></PageLayout>} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
