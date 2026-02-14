import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, CreditCard } from 'lucide-react';

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

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const getSubscription = (userId: string) =>
    subscribers.find(s => s.user_id === userId);

  const getUsage = (userId: string) =>
    usage.find(u => u.user_id === userId && u.month_year === currentMonth);

  const tierColor = (tier: string | null) => {
    if (tier === 'premium') return 'default';
    if (tier === 'professional') return 'default';
    return 'secondary';
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
        <CardContent className="space-y-2 max-h-[50vh] overflow-y-auto">
          {users.map(u => {
            const sub = getSubscription(u.id);
            const monthUsage = getUsage(u.id);
            return (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{u.full_name || u.email || 'Okänd'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge variant={tierColor(sub?.subscription_tier)} className="text-xs">
                    {sub?.subscription_tier || 'free'}
                  </Badge>
                  {monthUsage && (
                    <span className="text-xs text-muted-foreground">
                      {monthUsage.ai_analyses_used} AI
                    </span>
                  )}
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
