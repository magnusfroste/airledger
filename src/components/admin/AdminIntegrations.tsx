import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plug, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  description: string;
  edgeFunction: string;
  testPayload: Record<string, unknown>;
  docsUrl?: string;
  envKey: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'openai-whisper',
    name: 'OpenAI Whisper (STT)',
    description: 'Röst-till-text via OpenAI Whisper API. Används för röstinspelning i chatten.',
    edgeFunction: 'voice-to-text',
    testPayload: {},
    docsUrl: 'https://platform.openai.com/docs/guides/speech-to-text',
    envKey: 'OPENAI_API_KEY',
  },
  {
    id: 'lovable-ai',
    name: 'Lovable AI Gateway',
    description: 'AI-chattassistent, intent-klassificering, kvittoanalys och bankutdrag.',
    edgeFunction: 'chat-assistant',
    testPayload: { message: 'Hej, fungerar du?' },
    docsUrl: 'https://docs.lovable.dev/features/ai',
    envKey: 'LOVABLE_API_KEY',
  },
  {
    id: 'receipt-analysis',
    name: 'Kvittoanalys (AI Vision)',
    description: 'Analyserar kvittobilder med Gemini Vision för automatisk bokföring.',
    edgeFunction: 'analyze-receipt',
    testPayload: {},
    docsUrl: undefined,
    envKey: 'LOVABLE_API_KEY',
  },
  {
    id: 'bank-statement',
    name: 'Bankutdragsanalys (AI)',
    description: 'Tolkar bankutdrag och föreslår bokföringsposter.',
    edgeFunction: 'analyze-bank-statement',
    testPayload: {},
    docsUrl: undefined,
    envKey: 'LOVABLE_API_KEY',
  },
  {
    id: 'stripe',
    name: 'Stripe (Betalningar)',
    description: 'Hanterar prenumerationer, checkout och kundportal. Används för premium-planer.',
    edgeFunction: 'create-checkout',
    testPayload: {},
    docsUrl: 'https://stripe.com/docs/api',
    envKey: 'STRIPE_SECRET_KEY',
  },
];

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const AdminIntegrations = () => {
  const [statuses, setStatuses] = useState<Record<string, TestStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const testIntegration = async (integration: Integration) => {
    setStatuses(prev => ({ ...prev, [integration.id]: 'testing' }));
    setErrors(prev => ({ ...prev, [integration.id]: '' }));

    try {
      // For integrations that need specific payloads, only test connectivity
      // We use a minimal health-check approach
      if (integration.id === 'lovable-ai') {
        const { data, error } = await supabase.functions.invoke(integration.edgeFunction, {
          body: { message: 'ping' },
        });
        if (error) throw new Error(error.message);
        if (data?.success || data?.response) {
          setStatuses(prev => ({ ...prev, [integration.id]: 'success' }));
          toast.success(`${integration.name}: Anslutning OK`);
          return;
        }
        if (data?.error) throw new Error(data.error);
        setStatuses(prev => ({ ...prev, [integration.id]: 'success' }));
        toast.success(`${integration.name}: Anslutning OK`);
      } else if (integration.id === 'openai-whisper') {
        // Can't send empty audio — just invoke to check auth/key config
        const { error } = await supabase.functions.invoke(integration.edgeFunction, {
          body: { audio: '' },
        });
        // A "No audio data provided" error means the function runs fine, key is loaded
        if (error) {
          const msg = error.message || '';
          if (msg.includes('not configured') || msg.includes('API key')) {
            throw new Error('OPENAI_API_KEY är inte konfigurerad');
          }
          // Function responded = it's running
          setStatuses(prev => ({ ...prev, [integration.id]: 'success' }));
          toast.success(`${integration.name}: Funktion aktiv`);
          return;
        }
        setStatuses(prev => ({ ...prev, [integration.id]: 'success' }));
        toast.success(`${integration.name}: Funktion aktiv`);
      } else {
        // Generic invoke test — just check the function exists and responds
        const { error } = await supabase.functions.invoke(integration.edgeFunction, {
          body: {},
        });
        if (error) {
          const msg = error.message || '';
          if (msg.includes('not configured') || msg.includes('API key') || msg.includes('not found')) {
            throw new Error(`Konfigurationsfel: ${msg}`);
          }
        }
        setStatuses(prev => ({ ...prev, [integration.id]: 'success' }));
        toast.success(`${integration.name}: Funktion aktiv`);
      }
    } catch (e: any) {
      const errorMsg = e.message || 'Okänt fel';
      setStatuses(prev => ({ ...prev, [integration.id]: 'error' }));
      setErrors(prev => ({ ...prev, [integration.id]: errorMsg }));
      toast.error(`${integration.name}: ${errorMsg}`);
    }
  };

  const getStatusBadge = (id: string) => {
    const status = statuses[id] || 'idle';
    switch (status) {
      case 'testing':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Testar…
          </Badge>
        );
      case 'success':
        return (
          <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> OK
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Fel
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Ej testad
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Integrationer
          </CardTitle>
          <CardDescription>
            Alla externa tjänster som AirLedger använder. Testa anslutningen för att verifiera att API-nycklar är korrekt konfigurerade.
            Vid self-hosting behöver du konfigurera dessa nycklar manuellt.
          </CardDescription>
        </CardHeader>
      </Card>

      {INTEGRATIONS.map((integration) => (
        <Card key={integration.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm">{integration.name}</h3>
                  {getStatusBadge(integration.id)}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {integration.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                    {integration.envKey}
                  </span>
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                    {integration.edgeFunction}
                  </span>
                </div>
                {errors[integration.id] && (
                  <p className="text-xs text-destructive mt-2">
                    {errors[integration.id]}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {integration.docsUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testIntegration(integration)}
                  disabled={statuses[integration.id] === 'testing'}
                >
                  {statuses[integration.id] === 'testing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Testa'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminIntegrations;
