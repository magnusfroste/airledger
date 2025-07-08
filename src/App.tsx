import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import Transactions from "./pages/Transactions";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
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
                  <main className="h-[calc(100vh-48px-64px)]"> {/* Full height minus header and bottom nav */}
                    <Routes>
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/transactions" element={<div className="pb-2"><Transactions /></div>} />
                      <Route path="/templates" element={<div className="pb-2"><Templates /></div>} />
                      <Route path="/settings" element={<div className="pb-2"><Settings /></div>} />
                      <Route path="/reports" element={<div className="pb-2"><Reports /></div>} />
                      <Route path="/opening-balances" element={<div className="pb-2"><OpeningBalances /></div>} />
                      <Route path="/general-ledger" element={<div className="pb-2"><GeneralLedger /></div>} />
                      <Route path="/subscription" element={<div className="pb-2"><Subscription /></div>} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<div className="pb-2"><NotFound /></div>} />
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
