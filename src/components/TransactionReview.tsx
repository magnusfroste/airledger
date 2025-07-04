import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertTriangle, Search, Filter, Download, Plus } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  status: 'pending' | 'reviewed' | 'flagged';
  source: 'manual' | 'receipt' | 'bank_import';
  vendor?: string;
  receiptId?: string;
}

const TransactionReview = () => {
  const [transactions] = useState<Transaction[]>([
    {
      id: '1',
      date: '2024-01-03',
      description: 'ICA Maxi Stockholm - Livsmedelsinköp',
      amount: -487.50,
      category: 'Kontorsmaterial',
      status: 'pending',
      source: 'receipt',
      vendor: 'ICA Maxi Stockholm',
      receiptId: 'rec_001'
    },
    {
      id: '2',
      date: '2024-01-02',
      description: 'Telia AB - Månadsavgift telefon',
      amount: -299.00,
      category: 'Telekommunikation',
      status: 'reviewed',
      source: 'bank_import',
      vendor: 'Telia AB'
    },
    {
      id: '3',
      date: '2024-01-02',
      description: 'Kund ABC AB - Faktura #2024-001',
      amount: 15000.00,
      category: 'Försäljning',
      status: 'reviewed',
      source: 'manual',
      vendor: 'ABC AB'
    },
    {
      id: '4',
      date: '2024-01-01',
      description: 'Okänd transaktion - Kontrollera',
      amount: -150.00,
      category: 'Okategoriserad',
      status: 'flagged',
      source: 'bank_import'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = [
    'Kontorsmaterial', 'Telekommunikation', 'Försäljning', 
    'Marknadsföring', 'Resa', 'Måltider', 'Okategoriserad'
  ];

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reviewed': return 'success';
      case 'flagged': return 'destructive';
      default: return 'warning';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'reviewed': return 'Granskad';
      case 'flagged': return 'Flaggad';
      default: return 'Väntar';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'receipt': return '📄';
      case 'bank_import': return '🏦';
      default: return '✏️';
    }
  };

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const flaggedCount = transactions.filter(t => t.status === 'flagged').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Transaktionsgranskning</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{pendingCount} väntar</span>
                {flaggedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-destructive">{flaggedCount} flaggade</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="professional" size="sm">
              <Download className="h-4 w-4" />
              Exportera
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50 bg-gradient-surface shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totalt att granska</p>
                  <p className="text-2xl font-bold text-foreground">{pendingCount + flaggedCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-surface shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foregorund">Granskade denna månad</p>
                  <p className="text-2xl font-bold text-success">24</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-surface shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Genomsnittlig tid</p>
                  <p className="text-2xl font-bold text-foreground">2.3 min</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-border/50 bg-surface shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Filter och sök</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök transaktioner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="pending">Väntar</SelectItem>
                  <SelectItem value="reviewed">Granskad</SelectItem>
                  <SelectItem value="flagged">Flaggad</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kategorier</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="default">
                <Plus className="h-4 w-4" />
                Ny transaktion
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="border-border/50 bg-surface shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">
                Transaktioner ({filteredTransactions.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`p-4 rounded-lg border transition-colors hover:bg-background/50 ${
                  transaction.status === 'flagged' 
                    ? 'border-destructive/30 bg-destructive/5' 
                    : 'border-border/50 bg-background/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getSourceIcon(transaction.source)}</span>
                      <Badge 
                        variant={getStatusColor(transaction.status) as any}
                        className="text-xs"
                      >
                        {getStatusText(transaction.status)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{transaction.date}</span>
                    </div>
                    
                    <h3 className="font-medium text-foreground mb-1">
                      {transaction.description}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Kategori: {transaction.category}</span>
                      {transaction.vendor && <span>• {transaction.vendor}</span>}
                      {transaction.receiptId && <span>• Kvitto: {transaction.receiptId}</span>}
                    </div>
                  </div>
                  
                  <div className="text-right space-y-2">
                    <p className={`text-lg font-semibold ${
                      transaction.amount > 0 ? 'text-success' : 'text-foreground'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString('sv-SE')} kr
                    </p>
                    
                    <div className="flex gap-2">
                      {transaction.status === 'pending' && (
                        <>
                          <Button variant="success" size="sm">
                            Godkänn
                          </Button>
                          <Button variant="outline" size="sm">
                            Redigera
                          </Button>
                        </>
                      )}
                      {transaction.status === 'flagged' && (
                        <Button variant="destructive" size="sm">
                          Granska
                        </Button>
                      )}
                      {transaction.status === 'reviewed' && (
                        <Button variant="ghost" size="sm">
                          Visa detaljer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredTransactions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Inga transaktioner hittades med aktuella filter.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionReview;