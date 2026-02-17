import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Globe, Search, Bot } from 'lucide-react';
import { toast } from 'sonner';

interface SEOSettings {
  site_title: string;
  site_description: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  canonical_url: string;
  robots_index: boolean;
  robots_follow: boolean;
  json_ld_org_name: string;
  json_ld_org_url: string;
  json_ld_logo_url: string;
  json_ld_type: string;
  aeo_faq_enabled: boolean;
  aeo_how_to_enabled: boolean;
  custom_head_tags: string;
}

const DEFAULTS: SEOSettings = {
  site_title: 'AirLedger – AI-driven bokföring',
  site_description: 'Enkel och smart bokföring med AI. Fotografera kvitton, prata med din bokföringsassistent.',
  og_title: '',
  og_description: '',
  og_image_url: '',
  canonical_url: '',
  robots_index: true,
  robots_follow: true,
  json_ld_org_name: 'AirLedger',
  json_ld_org_url: '',
  json_ld_logo_url: '',
  json_ld_type: 'SoftwareApplication',
  aeo_faq_enabled: false,
  aeo_how_to_enabled: false,
  custom_head_tags: '',
};

const AdminSEO = () => {
  const [settings, setSettings] = useState<SEOSettings>(DEFAULTS);
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
        .like('key', 'seo_%');

      if (data) {
        const loaded = { ...DEFAULTS };
        data.forEach(row => {
          const field = row.key.replace('seo_', '') as keyof SEOSettings;
          if (field in loaded) {
            const val = row.value;
            if (typeof loaded[field] === 'boolean') {
              (loaded as any)[field] = val === 'true';
            } else {
              (loaded as any)[field] = val;
            }
          }
        });
        setSettings(loaded);
      }
    } catch (e) {
      console.error('Failed to load SEO settings', e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(settings).map(([key, value]) => ({
        key: `seo_${key}`,
        value: String(value),
      }));

      for (const entry of entries) {
        await supabase
          .from('system_settings')
          .upsert({ key: entry.key, value: entry.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }

      toast.success('SEO/AEO-inställningar sparade');
    } catch (e) {
      toast.error('Kunde inte spara inställningar');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof SEOSettings>(key: K, value: SEOSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SEO – Meta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-4 w-4" />
            SEO – Metataggar
          </CardTitle>
          <CardDescription>Styr hur sökresultat och sociala delningar ser ut.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Sidtitel (title)</Label>
            <Input value={settings.site_title} onChange={e => update('site_title', e.target.value)} maxLength={60} />
            <p className="text-xs text-muted-foreground">{settings.site_title.length}/60 tecken</p>
          </div>
          <div className="space-y-1.5">
            <Label>Beskrivning (meta description)</Label>
            <Textarea value={settings.site_description} onChange={e => update('site_description', e.target.value)} maxLength={160} rows={2} />
            <p className="text-xs text-muted-foreground">{settings.site_description.length}/160 tecken</p>
          </div>
          <div className="space-y-1.5">
            <Label>Kanonisk URL</Label>
            <Input value={settings.canonical_url} onChange={e => update('canonical_url', e.target.value)} placeholder="https://airledger.se" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={settings.robots_index} onCheckedChange={v => update('robots_index', v)} />
              <Label className="text-sm">Tillåt indexering</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.robots_follow} onCheckedChange={v => update('robots_follow', v)} />
              <Label className="text-sm">Tillåt länkföljning</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Graph */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-4 w-4" />
            Open Graph
          </CardTitle>
          <CardDescription>Kontrollera hur länkdelningar visas på sociala medier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>OG-titel (lämna tom = sidtitel)</Label>
            <Input value={settings.og_title} onChange={e => update('og_title', e.target.value)} placeholder={settings.site_title} />
          </div>
          <div className="space-y-1.5">
            <Label>OG-beskrivning</Label>
            <Textarea value={settings.og_description} onChange={e => update('og_description', e.target.value)} placeholder={settings.site_description} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>OG-bild URL</Label>
            <Input value={settings.og_image_url} onChange={e => update('og_image_url', e.target.value)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      {/* AEO – Structured Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-4 w-4" />
            AEO – Strukturerad data
          </CardTitle>
          <CardDescription>Optimera för AI-sökmotorer och featured snippets (JSON-LD).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Organisationsnamn</Label>
              <Input value={settings.json_ld_org_name} onChange={e => update('json_ld_org_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Schema-typ</Label>
              <Input value={settings.json_ld_type} onChange={e => update('json_ld_type', e.target.value)} placeholder="SoftwareApplication" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Organisations-URL</Label>
            <Input value={settings.json_ld_org_url} onChange={e => update('json_ld_org_url', e.target.value)} placeholder="https://airledger.se" />
          </div>
          <div className="space-y-1.5">
            <Label>Logotyp-URL</Label>
            <Input value={settings.json_ld_logo_url} onChange={e => update('json_ld_logo_url', e.target.value)} placeholder="https://..." />
          </div>

          <Separator />

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={settings.aeo_faq_enabled} onCheckedChange={v => update('aeo_faq_enabled', v)} />
              <Label className="text-sm">FAQ-schema (JSON-LD)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.aeo_how_to_enabled} onCheckedChange={v => update('aeo_how_to_enabled', v)} />
              <Label className="text-sm">HowTo-schema</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom head */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Anpassade &lt;head&gt;-taggar</CardTitle>
          <CardDescription>Lägg till egna metataggar, verifieringskoder m.m.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.custom_head_tags}
            onChange={e => update('custom_head_tags', e.target.value)}
            placeholder='<meta name="google-site-verification" content="..." />'
            rows={4}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Sparar...' : 'Spara inställningar'}
        </Button>
      </div>
    </div>
  );
};

export default AdminSEO;
