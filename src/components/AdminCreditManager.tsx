import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Plus, RotateCcw } from "lucide-react";

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
}

export default function AdminCreditManager() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [credits, setCredits] = useState("");
  const [currentUsage, setCurrentUsage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) fetchCurrentUsage(selectedUserId);
    else setCurrentUsage(null);
  }, [selectedUserId]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('email');
    if (data) setUsers(data);
  };

  const fetchCurrentUsage = async (userId: string) => {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data } = await supabase
      .from('usage_tracking')
      .select('ai_analyses_used')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .maybeSingle();
    setCurrentUsage(data?.ai_analyses_used ?? 0);
  };

  const handleAddCredits = async () => {
    if (!selectedUserId || !credits) return;
    setLoading(true);
    try {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const creditAmount = parseInt(credits);

      // Check if usage row exists
      const { data: existing } = await supabase
        .from('usage_tracking')
        .select('id, ai_analyses_used')
        .eq('user_id', selectedUserId)
        .eq('month_year', monthYear)
        .maybeSingle();

      if (existing) {
        const newValue = Math.max(0, existing.ai_analyses_used - creditAmount);
        await supabase
          .from('usage_tracking')
          .update({ ai_analyses_used: newValue })
          .eq('id', existing.id);
      }
      // If no row exists, usage is already 0

      toast({ title: "Krediter tillagda", description: `${creditAmount} krediter tillagda för användaren.` });
      setCredits("");
      fetchCurrentUsage(selectedUserId);
    } catch (err) {
      toast({ title: "Fel", description: "Kunde inte lägga till krediter.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetUsage = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await supabase
        .from('usage_tracking')
        .update({ ai_analyses_used: 0 })
        .eq('user_id', selectedUserId)
        .eq('month_year', monthYear);

      toast({ title: "Nollställt", description: "AI-användningen har nollställts." });
      fetchCurrentUsage(selectedUserId);
    } catch (err) {
      toast({ title: "Fel", description: "Kunde inte nollställa.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Kredithantering (Admin)
        </CardTitle>
        <CardDescription>
          Lägg till AI-krediter eller nollställ användning för en användare
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Välj användare</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Välj en användare..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email || u.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUserId && currentUsage !== null && (
          <div className="text-sm text-muted-foreground">
            Nuvarande användning: <span className="font-semibold text-foreground">{currentUsage}</span> AI-analyser denna månad
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label>Antal krediter att lägga till</Label>
            <Input
              type="number"
              min="1"
              value={credits}
              onChange={e => setCredits(e.target.value)}
              placeholder="t.ex. 50"
            />
          </div>
          <Button onClick={handleAddCredits} disabled={loading || !selectedUserId || !credits}>
            <Plus className="h-4 w-4 mr-1" />
            Lägg till
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={handleResetUsage}
          disabled={loading || !selectedUserId}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Nollställ användning
        </Button>
      </CardContent>
    </Card>
  );
}
