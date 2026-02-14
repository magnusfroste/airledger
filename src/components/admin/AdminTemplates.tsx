import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  template_name: string;
  description: string;
  category: string;
  keywords: string[] | null;
  template_entries: any;
  is_system_template: boolean;
  usage_count: number | null;
}

const AdminTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    template_name: '',
    description: '',
    category: '',
    keywords: '',
    template_entries: '',
  });

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('airledger_transaction_templates')
      .select('*')
      .eq('is_system_template', true)
      .order('category', { ascending: true });

    if (!error && data) setTemplates(data as Template[]);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const filtered = templates.filter(t =>
    t.template_name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ template_name: '', description: '', category: '', keywords: '', template_entries: '[]' });
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setForm({
      template_name: t.template_name,
      description: t.description,
      category: t.category,
      keywords: (t.keywords || []).join(', '),
      template_entries: JSON.stringify(t.template_entries, null, 2),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const entries = JSON.parse(form.template_entries);
      const keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean);

      const payload = {
        template_name: form.template_name,
        description: form.description,
        category: form.category,
        keywords,
        template_entries: entries,
        is_system_template: true,
        user_id: '00000000-0000-0000-0000-000000000000',
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('airledger_transaction_templates')
          .update(payload)
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success('Mall uppdaterad');
      } else {
        const { error } = await supabase
          .from('airledger_transaction_templates')
          .insert(payload);
        if (error) throw error;
        toast.success('Mall skapad');
      }

      setDialogOpen(false);
      fetchTemplates();
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte spara mallen');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vill du verkligen ta bort denna mall?')) return;
    const { error } = await supabase
      .from('airledger_transaction_templates')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Kunde inte ta bort: ' + error.message);
    } else {
      toast.success('Mall borttagen');
      fetchTemplates();
    }
  };

  if (loading) return <div className="text-muted-foreground">Laddar mallar...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Systemmallar ({templates.length})</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Ny mall
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök mall..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.map(t => (
          <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{t.template_name}</span>
                <Badge variant="secondary" className="text-xs">{t.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Redigera mall' : 'Ny systemmall'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mallnamn</Label>
              <Input value={form.template_name} onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))} />
            </div>
            <div>
              <Label>Beskrivning</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Kategori</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <Label>Nyckelord (kommaseparerade)</Label>
              <Input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="hyra, lokal, kontor" />
            </div>
            <div>
              <Label>Bokföringsposter (JSON)</Label>
              <Textarea
                value={form.template_entries}
                onChange={e => setForm(f => ({ ...f, template_entries: e.target.value }))}
                rows={10}
                className="font-mono text-xs"
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingTemplate ? 'Spara ändringar' : 'Skapa mall'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminTemplates;
