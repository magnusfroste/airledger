import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface WarningRule {
  id: string;
  rule_name: string;
  template_names: string[];
  threshold_amount: number;
  threshold_direction: string;
  threshold_max: number | null;
  warning_message: string;
  warning_type: string;
  is_active: boolean;
  sort_order: number;
}

const EMPTY_FORM = {
  rule_name: '',
  template_names: '',
  threshold_amount: '',
  threshold_direction: 'above',
  threshold_max: '',
  warning_message: '',
  warning_type: 'warning',
  sort_order: '0',
};

const AdminWarningRules = () => {
  const [rules, setRules] = useState<WarningRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WarningRule | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from('warning_rules' as any)
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data) setRules(data as any as WarningRule[]);
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, []);

  const openCreate = () => {
    setEditingRule(null);
    setForm({ ...EMPTY_FORM, sort_order: String(rules.length + 1) });
    setDialogOpen(true);
  };

  const openEdit = (r: WarningRule) => {
    setEditingRule(r);
    setForm({
      rule_name: r.rule_name,
      template_names: r.template_names.join(', '),
      threshold_amount: String(r.threshold_amount),
      threshold_direction: r.threshold_direction,
      threshold_max: r.threshold_max ? String(r.threshold_max) : '',
      warning_message: r.warning_message,
      warning_type: r.warning_type,
      sort_order: String(r.sort_order),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        rule_name: form.rule_name,
        template_names: form.template_names.split(',').map(s => s.trim()).filter(Boolean),
        threshold_amount: Number(form.threshold_amount),
        threshold_direction: form.threshold_direction,
        threshold_max: form.threshold_max ? Number(form.threshold_max) : null,
        warning_message: form.warning_message,
        warning_type: form.warning_type,
        sort_order: Number(form.sort_order),
      };

      if (editingRule) {
        const { error } = await supabase
          .from('warning_rules' as any)
          .update(payload as any)
          .eq('id', editingRule.id);
        if (error) throw error;
        toast.success('Regel uppdaterad');
      } else {
        const { error } = await supabase
          .from('warning_rules' as any)
          .insert(payload as any);
        if (error) throw error;
        toast.success('Regel skapad');
      }

      setDialogOpen(false);
      fetchRules();
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte spara regeln');
    }
  };

  const handleToggle = async (r: WarningRule) => {
    const { error } = await supabase
      .from('warning_rules' as any)
      .update({ is_active: !r.is_active } as any)
      .eq('id', r.id);
    if (!error) fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ta bort denna varningsregel?')) return;
    const { error } = await supabase
      .from('warning_rules' as any)
      .delete()
      .eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Regel borttagen'); fetchRules(); }
  };

  if (loading) return <div className="text-muted-foreground">Laddar regler...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Varningsregler ({rules.length})</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Ny regel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
        {rules.map(r => (
          <div
            key={r.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              r.is_active ? 'bg-card hover:bg-muted/50' : 'bg-muted/30 opacity-60'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {r.warning_type === 'warning' ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                )}
                <span className="font-medium text-sm truncate">{r.rule_name}</span>
                <Badge variant="outline" className="text-xs">
                  {r.threshold_direction === 'between'
                    ? `${r.threshold_amount}–${r.threshold_max} kr`
                    : `${r.threshold_direction === 'above' ? '>' : '<'} ${r.threshold_amount.toLocaleString('sv-SE')} kr`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                Mallar: {r.template_names.join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Switch checked={r.is_active} onCheckedChange={() => handleToggle(r)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Inga varningsregler ännu</p>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Redigera regel' : 'Ny varningsregel'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Regelnamn</Label>
              <Input value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} />
            </div>
            <div>
              <Label>Mallnamn (kommaseparerade)</Label>
              <Input
                value={form.template_names}
                onChange={e => setForm(f => ({ ...f, template_names: e.target.value }))}
                placeholder="Extern representation mat, Intern representation"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tröskelbelopp (kr)</Label>
                <Input
                  type="number"
                  value={form.threshold_amount}
                  onChange={e => setForm(f => ({ ...f, threshold_amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Riktning</Label>
                <Select value={form.threshold_direction} onValueChange={v => setForm(f => ({ ...f, threshold_direction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Över</SelectItem>
                    <SelectItem value="below">Under</SelectItem>
                    <SelectItem value="between">Mellan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.threshold_direction === 'between' && (
              <div>
                <Label>Max-belopp (kr)</Label>
                <Input
                  type="number"
                  value={form.threshold_max}
                  onChange={e => setForm(f => ({ ...f, threshold_max: e.target.value }))}
                />
              </div>
            )}
            <div>
              <Label>Varningsmeddelande</Label>
              <Textarea
                value={form.warning_message}
                onChange={e => setForm(f => ({ ...f, warning_message: e.target.value }))}
                rows={3}
                placeholder="Använd {threshold} för att infoga tröskelbeloppet"
              />
              <p className="text-xs text-muted-foreground mt-1">{'{threshold}'} ersätts med tröskelbeloppet</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Typ</Label>
                <Select value={form.warning_type} onValueChange={v => setForm(f => ({ ...f, warning_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">⚠️ Varning</SelectItem>
                    <SelectItem value="info">💡 Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sortering</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingRule ? 'Spara ändringar' : 'Skapa regel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminWarningRules;
