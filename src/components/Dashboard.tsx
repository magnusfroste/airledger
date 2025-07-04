import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Camera, TrendingUp, FileText, Plus, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

const Dashboard = () => {
  const { user } = useAuth();
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "God morgon";
    if (hour < 17) return "God middag";
    return "God kväll";
  });

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Användare';

  const recentTransactions = [
    { id: 1, description: "ICA Maxi Stockholm", amount: -487.50, date: "2024-01-03", category: "Livsmedelsinköp" },
    { id: 2, description: "Telia AB", amount: -299.00, date: "2024-01-02", category: "Telefonräkning" },
    { id: 3, description: "Kund ABC AB", amount: 15000.00, date: "2024-01-02", category: "Försäljning" },
  ];

  const quickStats = [
    { label: "Månadsresultat", value: "+12,450 kr", trend: "up", color: "success" },
    { label: "Utestående fakturor", value: "3 fakturor", trend: "neutral", color: "warning" },
    { label: "Kvitton att granska", value: "7 stycken", trend: "neutral", color: "primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
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
            <div className="h-8 w-8 rounded-full bg-gradient-primary" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-success/5">
        <div className="container px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{greeting}, {userName}! 👋</p>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Ditt företags ekonomi
                  <span className="block text-primary">alltid uppdaterad</span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  AI-driven bokföring som gör vardagen enklare för svenska småföretag
                </p>
              </div>
              
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="success" size="lg" className="flex-1 sm:flex-none" asChild>
                  <Link to="/transactions">
                    <Plus className="h-4 w-4" />
                    Ny transaktion
                  </Link>
                </Button>
                <Button variant="professional" size="lg" className="flex-1 sm:flex-none" asChild>
                  <Link to="/chat">
                    <MessageCircle className="h-4 w-4" />
                    Chatta med AI
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src={heroImage} 
                alt="Air Ledger Dashboard" 
                className="w-full rounded-2xl shadow-large border border-border/20"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-primary/10 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="container px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {quickStats.map((stat, index) => (
            <Card key={index} className="border-border/50 bg-gradient-surface shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full bg-${stat.color}/10 flex items-center justify-center`}>
                    <TrendingUp className={`h-6 w-6 text-${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="container px-4 py-8">
        <Card className="border-border/50 bg-surface shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-foreground">Senaste transaktioner</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/transactions">
                  <FileText className="h-4 w-4" />
                  Visa alla
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-background border border-border/30">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">{transaction.date}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className={`font-semibold ${transaction.amount > 0 ? 'text-success' : 'text-foreground'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString('sv-SE')} kr
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {transaction.category}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="container px-4 py-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Snabbåtgärder</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Button variant="floating" className="h-20 flex-col gap-2" asChild>
            <Link to="/chat">
              <Camera className="h-6 w-6" />
              <span>Fotografera kvitto</span>
            </Link>
          </Button>
          <Button variant="floating" className="h-20 flex-col gap-2" asChild>
            <Link to="/chat">
              <MessageCircle className="h-6 w-6" />
              <span>Fråga AI-assistenten</span>
            </Link>
          </Button>
          <Button variant="floating" className="h-20 flex-col gap-2" asChild>
            <Link to="/transactions">
              <FileText className="h-6 w-6" />
              <span>Skapa faktura</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;