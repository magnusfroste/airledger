import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const AdminPrompt = () => {
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('*')
        .eq('key', 'system_prompt')
        .single();

      if (!error && data) {
        setPrompt((data as any).value);
        setOriginalPrompt((data as any).value);
        setUpdatedAt((data as any).updated_at);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings' as any)
        .update({ value: prompt, updated_at: new Date().toISOString() } as any)
        .eq('key', 'system_prompt');

      if (error) throw error;
      setOriginalPrompt(prompt);
      setUpdatedAt(new Date().toISOString());
      toast.success('System-prompt uppdaterad! Ändringen gäller direkt.');
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte spara');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = prompt !== originalPrompt;
  const charCount = prompt.length;

  if (loading) return <div className="text-muted-foreground">Laddar prompt...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">AI System-prompt</CardTitle>
            <CardDescription>
              Styr hur AI-assistenten beter sig. Ändringar gäller direkt utan deploy.
            </CardDescription>
          </div>
          {updatedAt && (
            <Badge variant="outline" className="text-xs">
              Uppdaterad: {new Date(updatedAt).toLocaleDateString('sv-SE')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={16}
          className="font-mono text-sm"
          placeholder="System-prompt..."
        />
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{charCount} tecken</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrompt(originalPrompt)}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Ångra
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPrompt;
