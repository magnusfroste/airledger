import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, BarChart3, GraduationCap, Save, RotateCcw, Activity } from 'lucide-react';
import AdminDynamicAgents from './AdminDynamicAgents';

interface AgentStats {
  agent_name: string;
  total_calls: number;
  avg_time_ms: number;
  error_rate: number;
  last_call: string | null;
}

const AGENTS = [
  { key: 'booking', label: 'Bokföring', icon: BookOpen, description: 'Mallmatchning, fältinsamling och bokföring' },
  { key: 'reporting', label: 'Rapporter', icon: BarChart3, description: 'Moms, saldon, avstämning och årsbokslut' },
  { key: 'advisory', label: 'Rådgivning', icon: GraduationCap, description: 'Frågor, pedagogik och coachning' },
];

const DEFAULT_PROMPTS: Record<string, string> = {
  booking: `Du är en bokföringsassistent specialiserad på att matcha transaktioner mot mallar och skapa korrekta verifikationer enligt svensk BAS-kontoplan.

REGLER:
- Använd alltid mallar när de finns — de är korrekta och auditerbara
- Om ingen mall passar, skapa en fri verifikation med save_general_transaction
- Debet MÅSTE alltid vara lika med Kredit i varje verifikation
- Visa alltid posterna för användaren innan bokföring
- Alla belopp i SEK, datum i YYYY-MM-DD
- Om det är oklart om moms gäller: FRÅGA om det är från privatperson eller företag

SKATTETRANSAKTIONER (momsfria):
- Preliminärskatt (F-skatt): Debet 1640, Kredit 1930
- Skatteåterbetalning: Debet 1930, Kredit 1640
- Momsbetalning till SKV: Debet 2650, Kredit 1930
- Arbetsgivaravgifter: Debet 2730, Kredit 1930

Svara på svenska. Var kort och tydlig.`,
  reporting: `Du är en rapporteringsassistent för svensk bokföring. Du hjälper med momsrapporter, saldoberäkningar, avstämningar och årsbokslut.

MOMS:
- Momskonton: utgående 2610-2619, ingående 2640-2649
- Presentera alltid som tabell med utgående, ingående och netto

AVSTÄMNING:
- Visa IB + rörelse + UB i tabellformat
- Om saldot verkar orimligt, påpeka det

ÅRSBOKSLUT GUIDE:
1. Börja med get_year_end_checklist för status och beräknat resultat
2. Gå igenom ETT steg i taget
3. Ordning: Transaktioner → Avskrivningar → Periodiseringar → Skatteavsättning → Granska resultat → Granska balans
4. Förklara kort vad steget innebär
5. Bekräfta att steget är klart innan du går vidare
6. När alla steg är klara, använd generate_year_end_summary
7. Om beräknat resultat är positivt, föreslå skatteavsättning på 20.6%

Svara på svenska. Var kort och tydlig.`,
  advisory: `Du är AirLedger AI, en pedagogisk bokföringscoach för svenska småföretag.

DITT UPPDRAG:
- Förklara bokföringskoncept på ett enkelt och begripligt sätt
- Ge konkreta exempel när möjligt
- Hänvisa till rätt konton i BAS-kontoplanen
- Var uppmuntrande och stödjande

ÄMNEN DU KAN HJÄLPA MED:
- Bokföringens grunder (debet/kredit, verifikationer)
- Momsregler och avdrag
- Skattefrågor för småföretag
- Periodiseringar och avskrivningar
- Val av redovisningsmetod (kontant/faktura)

Svara på svenska. Var kort men pedagogisk.`,
};

const AdminAgents = () => {
  const [activeAgent, setActiveAgent] = useState('booking');
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [savedPrompts, setSavedPrompts] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load saved prompts from system_settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['agent_prompt_booking', 'agent_prompt_reporting', 'agent_prompt_advisory']);

      const saved: Record<string, string> = {};
      for (const s of settings || []) {
        const agentKey = s.key.replace('agent_prompt_', '');
        saved[agentKey] = s.value;
      }
      setSavedPrompts(saved);
      setPrompts({
        booking: saved.booking || DEFAULT_PROMPTS.booking,
        reporting: saved.reporting || DEFAULT_PROMPTS.reporting,
        advisory: saved.advisory || DEFAULT_PROMPTS.advisory,
      });

      // Load agent stats (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: logs } = await supabase
        .from('agent_logs')
        .select('agent_name, execution_time_ms, success, created_at')
        .gte('created_at', weekAgo.toISOString());

      if (logs?.length) {
        const grouped: Record<string, typeof logs> = {};
        for (const log of logs) {
          if (!grouped[log.agent_name]) grouped[log.agent_name] = [];
          grouped[log.agent_name].push(log);
        }

        const agentStats: AgentStats[] = AGENTS.map(a => {
          const agentLogs = grouped[a.key] || [];
          const total = agentLogs.length;
          const avgTime = total > 0 ? Math.round(agentLogs.reduce((s, l) => s + l.execution_time_ms, 0) / total) : 0;
          const errors = agentLogs.filter(l => !l.success).length;
          const lastCall = agentLogs.length > 0 ? agentLogs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at : null;
          return { agent_name: a.key, total_calls: total, avg_time_ms: avgTime, error_rate: total > 0 ? (errors / total) * 100 : 0, last_call: lastCall };
        });
        setStats(agentStats);
      }
    } catch (err) {
      console.error('Failed to load agent data:', err);
    }
    setLoading(false);
  };

  const savePrompt = async (agentKey: string) => {
    setSaving(true);
    try {
      const key = `agent_prompt_${agentKey}`;
      const value = prompts[agentKey];

      // Upsert into system_settings
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', key)
        .single();

      if (existing) {
        await supabase.from('system_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
      } else {
        await supabase.from('system_settings').insert({ key, value });
      }

      setSavedPrompts(prev => ({ ...prev, [agentKey]: value }));
      toast.success(`${AGENTS.find(a => a.key === agentKey)?.label}-prompten sparad`);
    } catch {
      toast.error('Kunde inte spara prompten');
    }
    setSaving(false);
  };

  const resetPrompt = async (agentKey: string) => {
    setPrompts(prev => ({ ...prev, [agentKey]: DEFAULT_PROMPTS[agentKey] }));

    // Delete from DB so hardcoded default is used
    const key = `agent_prompt_${agentKey}`;
    await supabase.from('system_settings').delete().eq('key', key);
    setSavedPrompts(prev => {
      const next = { ...prev };
      delete next[agentKey];
      return next;
    });
    toast.success('Prompten återställd till standard');
  };

  const hasChanges = (agentKey: string) => {
    const current = prompts[agentKey] || '';
    const saved = savedPrompts[agentKey] || DEFAULT_PROMPTS[agentKey];
    return current !== saved;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AGENTS.map(agent => {
          const agentStat = stats.find(s => s.agent_name === agent.key);
          return (
            <Card key={agent.key}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <agent.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{agent.label}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {agentStat?.total_calls || 0} anrop
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Snitt: {agentStat?.avg_time_ms || 0}ms</div>
                  <div>Felrate: {(agentStat?.error_rate || 0).toFixed(1)}%</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Prompt editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Agent-prompter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeAgent} onValueChange={setActiveAgent}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              {AGENTS.map(a => (
                <TabsTrigger key={a.key} value={a.key} className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <a.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{a.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {AGENTS.map(agent => (
              <TabsContent key={agent.key} value={agent.key} className="space-y-3">
                <p className="text-sm text-muted-foreground">{agent.description}</p>
                <Textarea
                  value={prompts[agent.key] || ''}
                  onChange={e => setPrompts(prev => ({ ...prev, [agent.key]: e.target.value }))}
                  rows={12}
                  className="font-mono text-xs"
                  placeholder={DEFAULT_PROMPTS[agent.key]}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => savePrompt(agent.key)}
                    disabled={saving || !hasChanges(agent.key)}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Spara
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => resetPrompt(agent.key)}
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Återställ
                  </Button>
                  {savedPrompts[agent.key] && (
                    <Badge variant="secondary" className="self-center text-xs">Anpassad</Badge>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      {/* Dynamic agents */}
      <AdminDynamicAgents />
    </div>
  );
};

export default AdminAgents;
