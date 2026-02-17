import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

interface AgentConfigRow {
  id: string;
  agent_name: string;
  display_name: string;
  description: string | null;
  system_prompt: string;
  triggers: string[];
  tools: string[];
  is_active: boolean;
  priority: number;
}

const ALL_INTENTS = [
  'book_expense', 'book_sale', 'book_payment', 'confirm_booking', 'opening_balance',
  'vat_report', 'account_balance', 'period_reconciliation', 'year_end', 'view_report',
  'ask_question', 'analyze_image', 'unknown',
];

const ALL_TOOLS = [
  'use_transaction_template',
  'save_opening_balance',
  'save_general_transaction',
  'calculate_vat_report',
  'calculate_account_balance',
  'get_year_end_checklist',
  'generate_year_end_summary',
];

const EMPTY_AGENT: Omit<AgentConfigRow, 'id'> = {
  agent_name: '',
  display_name: '',
  description: '',
  system_prompt: '',
  triggers: [],
  tools: [],
  is_active: true,
  priority: 0,
};

const AdminDynamicAgents = () => {
  const [agents, setAgents] = useState<AgentConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editAgent, setEditAgent] = useState<Partial<AgentConfigRow> | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('agent_config').select('*').order('priority', { ascending: false });
    setAgents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditAgent({ ...EMPTY_AGENT });
    setDialogOpen(true);
  };

  const openEdit = (agent: AgentConfigRow) => {
    setEditAgent({ ...agent });
    setDialogOpen(true);
  };

  const toggleTrigger = (trigger: string) => {
    if (!editAgent) return;
    const current = editAgent.triggers || [];
    setEditAgent({
      ...editAgent,
      triggers: current.includes(trigger) ? current.filter(t => t !== trigger) : [...current, trigger],
    });
  };

  const toggleTool = (tool: string) => {
    if (!editAgent) return;
    const current = editAgent.tools || [];
    setEditAgent({
      ...editAgent,
      tools: current.includes(tool) ? current.filter(t => t !== tool) : [...current, tool],
    });
  };

  const saveAgent = async () => {
    if (!editAgent?.agent_name || !editAgent.display_name || !editAgent.system_prompt) {
      toast.error('Fyll i alla obligatoriska fält');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        agent_name: editAgent.agent_name,
        display_name: editAgent.display_name,
        description: editAgent.description || null,
        system_prompt: editAgent.system_prompt,
        triggers: editAgent.triggers || [],
        tools: editAgent.tools || [],
        is_active: editAgent.is_active ?? true,
        priority: editAgent.priority || 0,
        updated_at: new Date().toISOString(),
      };

      if (editAgent.id) {
        await (supabase as any).from('agent_config').update(payload).eq('id', editAgent.id);
      } else {
        await (supabase as any).from('agent_config').insert(payload);
      }
      toast.success('Agent sparad');
      setDialogOpen(false);
      setEditAgent(null);
      load();
    } catch {
      toast.error('Kunde inte spara');
    }
    setSaving(false);
  };

  const deleteAgent = async (id: string) => {
    await (supabase as any).from('agent_config').delete().eq('id', id);
    toast.success('Agent borttagen');
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            Dynamiska agenter
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Ny agent</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editAgent?.id ? 'Redigera agent' : 'Ny dynamisk agent'}</DialogTitle>
              </DialogHeader>
              {editAgent && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Agent-namn (unikt ID)</Label>
                      <Input value={editAgent.agent_name || ''} onChange={e => setEditAgent({ ...editAgent, agent_name: e.target.value })} placeholder="compliance" disabled={!!editAgent.id} />
                    </div>
                    <div>
                      <Label>Visningsnamn</Label>
                      <Input value={editAgent.display_name || ''} onChange={e => setEditAgent({ ...editAgent, display_name: e.target.value })} placeholder="Regelefterlevnad" />
                    </div>
                  </div>
                  <div>
                    <Label>Beskrivning</Label>
                    <Input value={editAgent.description || ''} onChange={e => setEditAgent({ ...editAgent, description: e.target.value })} placeholder="Kort beskrivning..." />
                  </div>
                  <div>
                    <Label>System-prompt</Label>
                    <Textarea value={editAgent.system_prompt || ''} onChange={e => setEditAgent({ ...editAgent, system_prompt: e.target.value })} rows={8} className="font-mono text-xs" placeholder="Du är en specialistassistent..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Prioritet</Label>
                      <Input type="number" value={editAgent.priority || 0} onChange={e => setEditAgent({ ...editAgent, priority: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch checked={editAgent.is_active ?? true} onCheckedChange={v => setEditAgent({ ...editAgent, is_active: v })} />
                      <Label>Aktiv</Label>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Triggers (intent-typer)</Label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_INTENTS.map(t => (
                        <label key={t} className="flex items-center gap-1.5 text-xs">
                          <Checkbox checked={editAgent.triggers?.includes(t)} onCheckedChange={() => toggleTrigger(t)} />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Tillåtna verktyg</Label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_TOOLS.map(t => (
                        <label key={t} className="flex items-center gap-1.5 text-xs">
                          <Checkbox checked={editAgent.tools?.includes(t)} onCheckedChange={() => toggleTool(t)} />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={saveAgent} disabled={saving}><Save className="h-4 w-4 mr-1" />Spara</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Inga dynamiska agenter konfigurerade. Klicka "Ny agent" för att skapa en.</p>
        ) : (
          <div className="space-y-3">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{agent.display_name}</span>
                    <Badge variant="outline" className="text-xs">{agent.agent_name}</Badge>
                    {!agent.is_active && <Badge variant="secondary" className="text-xs">Inaktiv</Badge>}
                    <Badge variant="secondary" className="text-xs">Prio: {agent.priority}</Badge>
                  </div>
                  {agent.description && <p className="text-xs text-muted-foreground">{agent.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {agent.triggers.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(agent)}>Redigera</Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteAgent(agent.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminDynamicAgents;
