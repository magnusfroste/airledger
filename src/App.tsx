
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
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
                <UserPreferencesProvider>
                  <AppLayout>
                    <Routes>
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/transactions" element={<Transactions />} />
                      <Route path="/templates" element={<Templates />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/balance-sheet" element={<BalanceSheet />} />
                      <Route path="/opening-balances" element={<OpeningBalances />} />
                      <Route path="/general-ledger" element={<GeneralLedger />} />
                      <Route path="/subscription" element={<Subscription />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </UserPreferencesProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
