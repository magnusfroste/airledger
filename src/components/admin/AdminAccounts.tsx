import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string | null;
  account_category: string | null;
  is_active: boolean;
}

const classNames: Record<string, string> = {
  '1': 'Tillgångar',
  '2': 'Eget kapital & Skulder',
  '3': 'Intäkter',
  '4': 'Kostnader varor',
  '5': 'Lokalkostnader',
  '6': 'Övriga kostnader',
  '7': 'Personal',
  '8': 'Finansiellt',
};

const AdminAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>('');

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('airledger_chart_of_accounts')
      .select('*')
      .order('account_code', { ascending: true });

    if (!error && data) setAccounts(data);
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const filtered = accounts.filter(a => {
    const matchesSearch = a.account_code.includes(search) || a.account_name.toLowerCase().includes(search.toLowerCase());
    const matchesClass = !filterClass || a.account_code.startsWith(filterClass);
    return matchesSearch && matchesClass;
  });

  const activeCount = accounts.filter(a => a.is_active).length;

  // Note: toggling is_active requires admin RLS on chart_of_accounts
  // For now this is read-only since chart_of_accounts doesn't have update policy
  // The admin can use SQL editor for changes

  if (loading) return <div className="text-muted-foreground">Laddar kontoplan...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          BAS-kontoplan ({activeCount} aktiva / {accounts.length} totalt)
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök konto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge
            variant={filterClass === '' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setFilterClass('')}
          >
            Alla
          </Badge>
          {Object.entries(classNames).map(([cls, name]) => (
            <Badge
              key={cls}
              variant={filterClass === cls ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setFilterClass(filterClass === cls ? '' : cls)}
            >
              {cls} {name}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="max-h-[60vh] overflow-y-auto">
        <div className="space-y-1">
          {filtered.slice(0, 100).map(a => (
            <div
              key={a.id}
              className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
                a.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium w-12">{a.account_code}</span>
                <span className="truncate">{a.account_name}</span>
              </div>
              <div className="flex items-center gap-2">
                {a.account_type && (
                  <Badge variant="outline" className="text-xs">{a.account_type}</Badge>
                )}
                <Badge variant={a.is_active ? 'default' : 'secondary'} className="text-xs">
                  {a.is_active ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </div>
            </div>
          ))}
          {filtered.length > 100 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Visar 100 av {filtered.length} konton. Använd sökfältet för att filtrera.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAccounts;
