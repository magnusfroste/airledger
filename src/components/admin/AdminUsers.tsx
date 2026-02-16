import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, Activity, CreditCard, Plus, RotateCcw } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
}

interface SubscriberInfo {
  user_id: string | null;
  email: string;
  subscription_tier: string | null;
  subscribed: boolean;
}

interface UsageInfo {
  user_id: string;
  month_year: string;
  ai_analyses_used: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberInfo[]>([]);
  const [usage, setUsage] = useState<UsageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    const [profilesRes, subsRes, usageRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }),
      supabase.from('subscribers').select('user_id, email, subscription_tier, subscribed'),
      supabase.from('usage_tracking').select('user_id, month_year, ai_analyses_used').order('month_year', { ascending: false }).limit(100),
    ]);

    if (profilesRes.data) setUsers(profilesRes.data);
    if (subsRes.data) setSubscribers(subsRes.data);
    if (usageRes.data) setUsage(usageRes.data as UsageInfo[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const getSubscription = (userId: string) =>
    subscribers.find(s => s.user_id === userId);

  const getUsage = (userId: string) =>
    usage.find(u => u.user_id === userId && u.month_year === currentMonth);

  const TIER_LIMITS: Record<string, number> = {
    free: 50,
    premium: 500,
    professional: -1,
  };

  const getTierLimit = (tier: string | null) => TIER_LIMITS[tier || 'free'] ?? 50;

  const tierColor = (tier: string | null) => {
    if (tier === 'professional') return 'default' as const;
    if (tier === 'premium') return 'default' as const;
    return 'secondary' as const;
  };

  const handleAddCredits = async (userId: string) => {
    const amount = parseInt(creditInputs[userId] || '0');
    if (!amount || amount <= 0) return;
    setActionLoading(userId);
    try {
      const existing = getUsage(userId);
      if (existing) {
        const newValue = Math.max(0, existing.ai_analyses_used - amount);
        await supabase
          .from('usage_tracking')
          .update({ ai_analyses_used: newValue })
          .eq('user_id', userId)
          .eq('month_year', currentMonth);
      }
      toast({ title: "Klart", description: `${amount} krediter tillagda.` });
      setCreditInputs(prev => ({ ...prev, [userId]: '' }));
      await fetchData();
    } catch {
      toast({ title: "Fel", description: "Kunde inte lägga till krediter.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetUsage = async (userId: string) => {
    setActionLoading(userId);
    try {
      await supabase
        .from('usage_tracking')
        .update({ ai_analyses_used: 0 })
        .eq('user_id', userId)
        .eq('month_year', currentMonth);
      toast({ title: "Nollställt", description: "AI-användningen har nollställts." });
      await fetchData();
    } catch {
      toast({ title: "Fel", description: "Kunde inte nollställa.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="text-muted-foreground">Laddar användare...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Användare</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{subscribers.filter(s => s.subscribed).length}</div>
            <p className="text-xs text-muted-foreground">Betalande</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">
              {usage.filter(u => u.month_year === currentMonth).reduce((sum, u) => sum + u.ai_analyses_used, 0)}
            </div>
            <p className="text-xs text-muted-foreground">AI-anrop ({currentMonth})</p>
          </CardContent>
        </Card>
      </div>

      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registrerade användare</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
          {users.map(u => {
            const sub = getSubscription(u.id);
            const tier = sub?.subscription_tier || 'free';
            const limit = getTierLimit(tier);
            const monthUsage = getUsage(u.id);
            const used = monthUsage?.ai_analyses_used ?? 0;
            const isActing = actionLoading === u.id;
            return (
              <div key={u.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{u.full_name || u.email || 'Okänd'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant={tierColor(tier)} className="text-xs capitalize">
                      {tier}
                    </Badge>
                    {sub?.subscribed && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                        Aktiv
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  AI-användning: <span className="font-medium text-foreground">{used}</span> / {limit === -1 ? '∞' : limit}
                  {sub?.subscribed && sub?.subscription_tier !== 'free' && (
                    <span className="ml-2">
                      · Prenumeration gäller
                    </span>
                  )}
                </div>
                {/* Credit actions */}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Krediter"
                    value={creditInputs[u.id] || ''}
                    onChange={e => setCreditInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                    className="h-8 text-xs w-24"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={isActing || !creditInputs[u.id]}
                    onClick={() => handleAddCredits(u.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Lägg till
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    disabled={isActing}
                    onClick={() => handleResetUsage(u.id)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Nollställ
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
