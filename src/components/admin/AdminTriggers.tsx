import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Clock, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

interface Trigger {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  month: number;
  day: number;
  days_before: number;
  quick_action_label: string;
  quick_action_message: string;
  is_active: boolean;
  priority: number;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  trigger_type: 'recurring_yearly',
  month: '1',
  day: '1',
  days_before: '14',
  quick_action_label: '',
  quick_action_message: '',
  priority: '0',
};

function getNextOccurrence(month: number, day: number): Date {
  const now = new Date();
  const thisYear = now.getFullYear();
  let next = new Date(thisYear, month - 1, day);
  if (next <= now) next = new Date(thisYear + 1, month - 1, day);
  return next;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const AdminTriggers = () => {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Trigger | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchTriggers = async () => {
    const { data, error } = await supabase
      .from('air_triggers' as any)
      .select('*')
      .order('priority', { ascending: false });

    if (!error && data) setTriggers(data as any as Trigger[]);
    setLoading(false);
  };

  useEffect(() => { fetchTriggers(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: Trigger) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || '',
      trigger_type: t.trigger_type,
      month: String(t.month),
      day: String(t.day),
      days_before: String(t.days_before),
      quick_action_label: t.quick_action_label,
      quick_action_message: t.quick_action_message,
      priority: String(t.priority),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        trigger_type: form.trigger_type,
        month: Number(form.month),
        day: Number(form.day),
        days_before: Number(form.days_before),
        quick_action_label: form.quick_action_label,
        quick_action_message: form.quick_action_message,
        priority: Number(form.priority),
      };

      if (editing) {
        const { error } = await supabase
          .from('air_triggers' as any)
          .update(payload as any)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Trigger uppdaterad');
      } else {
        const { error } = await supabase
          .from('air_triggers' as any)
          .insert(payload as any);
        if (error) throw error;
        toast.success('Trigger skapad');
      }

      setDialogOpen(false);
      fetchTriggers();
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte spara');
    }
  };

  const handleToggle = async (t: Trigger) => {
    const { error } = await supabase
      .from('air_triggers' as any)
      .update({ is_active: !t.is_active } as any)
      .eq('id', t.id);
    if (!error) fetchTriggers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ta bort denna trigger?')) return;
    const { error } = await supabase
      .from('air_triggers' as any)
      .delete()
      .eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Trigger borttagen'); fetchTriggers(); }
  };

  if (loading) return <div className="text-muted-foreground">Laddar triggers...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Triggers ({triggers.length})</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Ny trigger
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
        {triggers.map(t => {
          const next = getNextOccurrence(t.month, t.day);
          const days = daysUntil(next);
          const isWarm = days <= t.days_before;

          return (
            <div
              key={t.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                t.is_active ? 'bg-card hover:bg-muted/50' : 'bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-medium text-sm">{t.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {t.day}/{t.month}
                  </Badge>
                  {isWarm && t.is_active && (
                    <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                      {days}d kvar
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <CalendarClock className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Nästa: {formatDate(next)} · Knapp: "{t.quick_action_label}"
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Checkbox checked={t.is_active} onCheckedChange={() => handleToggle(t)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {triggers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Inga triggers ännu</p>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Redigera trigger' : 'Ny trigger'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Namn</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Beskrivning</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label>Typ</Label>
              <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring_yearly">Årligen</SelectItem>
                  <SelectItem value="recurring_quarterly">Kvartalsvis</SelectItem>
                  <SelectItem value="one_time">Engångs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Månad</Label>
                <Input type="number" min={1} max={12} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
              </div>
              <div>
                <Label>Dag</Label>
                <Input type="number" min={1} max={31} value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))} />
              </div>
              <div>
                <Label>Dagar före</Label>
                <Input type="number" min={1} value={form.days_before} onChange={e => setForm(f => ({ ...f, days_before: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Knapptext</Label>
              <Input value={form.quick_action_label} onChange={e => setForm(f => ({ ...f, quick_action_label: e.target.value }))} placeholder="T.ex. Momsrapport Q1" />
            </div>
            <div>
              <Label>Chattmeddelande</Label>
              <Textarea
                value={form.quick_action_message}
                onChange={e => setForm(f => ({ ...f, quick_action_message: e.target.value }))}
                rows={2}
                placeholder="Meddelandet som skickas till chatten"
              />
            </div>
            <div>
              <Label>Prioritet (högre = visas först)</Label>
              <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
            </div>

            {/* Preview */}
            {form.month && form.day && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="text-muted-foreground">
                  Nästa förekomst: <strong>{formatDate(getNextOccurrence(Number(form.month), Number(form.day)))}</strong>
                </p>
                <p className="text-muted-foreground">
                  Knappen visas: {Number(form.days_before)} dagar före deadline
                </p>
              </div>
            )}

            <Button onClick={handleSave} className="w-full">
              {editing ? 'Spara ändringar' : 'Skapa trigger'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminTriggers;
