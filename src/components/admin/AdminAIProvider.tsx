import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Bot, Key, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ProviderInfo {
  id: string;
  name: string;
  envKey: string;
  defaultModel: string;
  defaultVisionModel: string;
  models: string[];
  docsUrl: string;
  requiresBaseUrl?: boolean;
  defaultBaseUrl?: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'lovable',
    name: 'Lovable AI (standard)',
    envKey: 'LOVABLE_API_KEY',
    defaultModel: 'google/gemini-3-flash-preview',
    defaultVisionModel: 'google/gemini-2.5-flash',
    models: ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-5', 'openai/gpt-5-mini'],
    docsUrl: 'https://docs.lovable.dev/features/ai',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    defaultVisionModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
    docsUrl: 'https://platform.openai.com/docs',
  },
  {
    id: 'openai_compatible',
    name: 'Privat LLM (OpenAI-kompatibel)',
    envKey: 'OPENAI_COMPATIBLE_API_KEY',
    defaultModel: 'llama-3.1-8b-instruct',
    defaultVisionModel: 'llama-3.2-11b-vision',
    models: ['llama-3.1-8b-instruct', 'llama-3.1-70b-instruct', 'llama-3.2-11b-vision', 'mistral-7b-instruct', 'qwen2.5-7b-instruct'],
    docsUrl: 'https://platform.openai.com/docs/api-reference/chat',
    requiresBaseUrl: true,
    defaultBaseUrl: 'http://localhost:11434/v1',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
    defaultVisionModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    docsUrl: 'https://docs.anthropic.com',
  },
  {
    id: 'gemini',
    name: 'Google Gemini (direkt)',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.5-flash',
    defaultVisionModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    docsUrl: 'https://ai.google.dev/docs',
  },
];

const AdminAIProvider = () => {
  const [provider, setProvider] = useState('lovable');
  const [model, setModel] = useState('');
  const [visionModel, setVisionModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['ai_provider', 'ai_model', 'ai_vision_model', 'ai_base_url']);

      if (data) {
        const settings: Record<string, string> = {};
        data.forEach(r => { settings[r.key] = r.value; });
        if (settings.ai_provider) setProvider(settings.ai_provider);
        if (settings.ai_model) setModel(settings.ai_model);
        if (settings.ai_vision_model) setVisionModel(settings.ai_vision_model);
        if (settings.ai_base_url) setBaseUrl(settings.ai_base_url);
      }
    } catch (e) {
      console.error('Failed to load AI settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

  const saveSettings = async () => {
    setSaving(true);
    try {
      const entries = [
        { key: 'ai_provider', value: provider },
        { key: 'ai_model', value: model || selectedProvider.defaultModel },
        { key: 'ai_vision_model', value: visionModel || selectedProvider.defaultVisionModel },
        { key: 'ai_base_url', value: selectedProvider.requiresBaseUrl ? (baseUrl || selectedProvider.defaultBaseUrl || '') : '' },
      ];

      for (const entry of entries) {
        await supabase
          .from('system_settings')
          .upsert({ key: entry.key, value: entry.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }

      toast.success('AI-provider sparad');
    } catch (e) {
      toast.error('Kunde inte spara');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-4 w-4" />
          AI-provider
        </CardTitle>
        <CardDescription>
          Välj vilken AI-tjänst som ska användas. Vid self-hosting, ange din egen API-nyckel som miljövariabel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider selection */}
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => {
            setProvider(v);
            const p = PROVIDERS.find(p => p.id === v);
            if (p) {
              setModel(p.defaultModel);
              setVisionModel(p.defaultVisionModel);
              setBaseUrl(p.defaultBaseUrl || '');
            }
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Environment key info */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <Key className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="text-xs">
            <p className="font-medium">Miljövariabel: <code className="bg-background px-1.5 py-0.5 rounded">{selectedProvider.envKey}</code></p>
            <p className="text-muted-foreground mt-0.5">
              {provider === 'lovable' 
                ? 'Automatiskt konfigurerad. Ingen åtgärd krävs.'
                : `Lägg till nyckeln som miljövariabel vid self-hosting.`
              }
            </p>
          </div>
        </div>

        {selectedProvider.requiresBaseUrl && (
          <div className="space-y-1.5">
            <Label>Bas-URL för API</Label>
            <Input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder={selectedProvider.defaultBaseUrl}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              T.ex. <code>http://localhost:11434/v1</code> (Ollama), <code>http://localhost:1234/v1</code> (LM Studio) eller annan OpenAI-kompatibel endpoint. Måste sluta med <code>/v1</code>.
            </p>
          </div>
        )}

        {provider !== 'lovable' && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700">
              Vid byte till extern provider behöver du konfigurera API-nyckeln som 
              miljövariabel (<code>{selectedProvider.envKey}</code>) i din hosting-miljö.
              {selectedProvider.requiresBaseUrl && ' Lokala endpoints utan auth kan använda valfri sträng som nyckel.'} 
              Systemet faller automatiskt tillbaka till Lovable AI om nyckeln saknas.
            </p>
          </div>
        )}

        {/* Model selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Chattmodell</Label>
            <Select value={model || selectedProvider.defaultModel} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectedProvider.models.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Visionmodell (kvitton/bilder)</Label>
            <Select value={visionModel || selectedProvider.defaultVisionModel} onValueChange={setVisionModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectedProvider.models.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom model input */}
        <div className="space-y-1.5">
          <Label>Anpassad modell (valfritt)</Label>
          <Input
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder={selectedProvider.defaultModel}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">Ange ett anpassat modellnamn om det inte finns i listan ovan.</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {selectedProvider.name}
            </Badge>
            <a href={selectedProvider.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              Dokumentation →
            </a>
          </div>
          <Button onClick={saveSettings} disabled={saving} size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Sparar...' : 'Spara'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAIProvider;
