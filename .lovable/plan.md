
# Air 2.0 — Steg 2: Agent Intelligence & Observability

## Översikt

Steg 2 bygger vidare på agent-separationen med fyra kapabiliteter:

1. **Agent-to-Agent konsultation** — agenter kan fråga varandra
2. **Admin-UI för agent-prompter** — redigera prompter per agent i /admin
3. **Per-agent loggning & prestandamätning** — synlighet per agent
4. **Dynamisk agent-registrering** — lägg till agenter utan kodändringar

---

## 2.1 Agent-to-Agent konsultation

### Problem
BookingAgent behöver ibland veta momsregler (ReportingAgent-domän) eller ge pedagogiska förklaringar (AdvisoryAgent-domän). Idag finns ingen mekanism för detta.

### Design

```text
BookingAgent.execute()
  → "Är detta momsfritt?"
  → ctx.consult('advisory', { question: "Är begagnad utrustning momsfri?" })
  → AdvisoryAgent svarar med kort text
  → BookingAgent använder svaret i sin mallmatchning
```

### Implementation

**Fil: `agents/types.ts` — Utöka AgentContext**
```typescript
interface AgentContext {
  // ... befintliga fält
  consult: (agentName: string, query: ConsultQuery) => Promise<ConsultResult>;
}

interface ConsultQuery {
  question: string;
  context?: Record<string, any>;
}

interface ConsultResult {
  answer: string;
  confidence: number;
  source_agent: string;
}
```

**Fil: `agents/registry.ts` — Implementera consult**
```typescript
async function createConsultFn(
  agents: Record<string, Agent>,
  parentCtx: AgentContext,
  depth: number = 0
): (agentName: string, query: ConsultQuery) => Promise<ConsultResult> {
  return async (agentName, query) => {
    if (depth >= 2) throw new Error('Max consult depth reached');
    const agent = agents[agentName];
    // Skapa en mini-kontext med frågan, utan full historik
    const miniCtx = { ...parentCtx, message: query.question, conversationHistory: [] };
    const result = await agent.execute(miniCtx);
    return { answer: result.response, confidence: 1, source_agent: agentName };
  };
}
```

### Användningsfall
- BookingAgent → AdvisoryAgent: "Är köp av begagnad bil momsfritt?"
- ReportingAgent → BookingAgent: "Finns det en mall för skatteavsättning?"
- BookingAgent → ReportingAgent: "Vad är aktuellt saldo på konto 2650?"

### Begränsningar
- Max 2 nivåer djup (ingen rekursion)
- Konsultationer räknas mot AI-kvoten
- Loggning av varje konsultation för spårbarhet

---

## 2.2 Admin-UI för agent-prompter

### Problem
Idag redigeras system-prompten globalt i /admin. Med tre agenter behöver man kunna redigera prompten per agent.

### Design

**DB: `system_settings`** — Nya nycklar:
```text
agent_prompt_booking    → Booking-agentens system-prompt
agent_prompt_reporting  → Reporting-agentens system-prompt
agent_prompt_advisory   → Advisory-agentens system-prompt
```

**Admin-UI: Ny tab "AI-agenter" i /admin**
```text
┌─────────────────────────────────┐
│  AI-agenter                     │
│                                 │
│  [Booking] [Reporting] [Advisory]│
│                                 │
│  ┌─────────────────────────────┐│
│  │ System-prompt              ││
│  │                            ││
│  │ [Textarea med prompt]      ││
│  │                            ││
│  │ [Spara]  [Återställ]      ││
│  └─────────────────────────────┘│
│                                 │
│  Status: Aktiv ✅               │
│  Senast uppdaterad: 2026-02-17  │
│  Antal anrop idag: 42           │
└─────────────────────────────────┘
```

### Implementation

**Fil: `src/components/admin/AdminAgents.tsx`**
- Tabs per agent (booking, reporting, advisory)
- Textarea för att redigera prompt
- Spara till `system_settings` med nyckel `agent_prompt_{name}`
- Visa standard-prompt som placeholder
- Återställ-knapp som rensar DB-värdet (använder hardcoded default)

**Fil: `agents/prompts/*.ts` — Dynamisk laddning**
```typescript
export async function getAgentPrompt(
  agentName: string,
  supabase: any
): Promise<string> {
  const key = `agent_prompt_${agentName}`;
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (data?.value) return data.value;
  // Fallback till hardcoded prompt
  return DEFAULT_PROMPTS[agentName];
}
```

### Ändrade filer
- `src/pages/Admin.tsx` — Lägg till "Agenter"-tab
- `src/components/admin/AdminAgents.tsx` — Ny komponent
- `agents/booking-agent.ts` — Hämta prompt från DB
- `agents/reporting-agent.ts` — Hämta prompt från DB
- `agents/advisory-agent.ts` — Hämta prompt från DB

---

## 2.3 Per-agent loggning & prestandamätning

### Problem
Utan loggning per agent vet vi inte vilken agent som tar tid, vilka som failar, eller hur ofta de används.

### Design

**DB: Ny tabell `agent_logs`**
```sql
CREATE TABLE public.agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  intent TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  action_taken TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  consulted_agents TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index för snabb filtrering
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_name);
CREATE INDEX idx_agent_logs_created ON agent_logs(created_at DESC);

-- RLS: Bara admin kan läsa
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can read agent logs"
  ON agent_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role skriver (edge function)
CREATE POLICY "Service can insert agent logs"
  ON agent_logs FOR INSERT
  WITH CHECK (true);
```

**Fil: `agents/logger.ts`**
```typescript
export async function logAgentExecution(
  supabase: any,
  log: {
    userId: string;
    agentName: string;
    intent: string;
    executionTimeMs: number;
    actionTaken?: string;
    success: boolean;
    errorMessage?: string;
    consultedAgents?: string[];
  }
): Promise<void> {
  await supabase.from('agent_logs').insert({
    user_id: log.userId,
    agent_name: log.agentName,
    intent: log.intent,
    execution_time_ms: log.executionTimeMs,
    action_taken: log.actionTaken,
    success: log.success,
    error_message: log.errorMessage,
    consulted_agents: log.consultedAgents,
  });
}
```

**Orchestrator-integration (index.ts)**
```typescript
const start = performance.now();
const result = await routeToAgent(agentCtx);
const elapsed = Math.round(performance.now() - start);

// Logga asynkront (vänta inte)
logAgentExecution(serviceSupabase, {
  userId, agentName: agent.name, intent: intent.intent,
  executionTimeMs: elapsed, actionTaken: result.action_taken,
  success: true
}).catch(console.error);
```

**Admin-UI: Dashboard i "AI-agenter"-tabben**
```text
┌──────────────────────────────────┐
│  Agent-statistik (senaste 7d)    │
│                                  │
│  Booking:   142 anrop  avg 850ms │
│  Reporting:  38 anrop  avg 620ms │
│  Advisory:   67 anrop  avg 430ms │
│                                  │
│  Felrate: 2.1%                   │
│  Konsultationer: 12              │
└──────────────────────────────────┘
```

---

## 2.4 Dynamisk agent-registrering

### Problem
Idag är agenter hårdkodade i registry.ts. Att lägga till en ny agent kräver kodändring.

### Design

**DB: Ny tabell `agent_config`**
```sql
CREATE TABLE public.agent_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  triggers TEXT[] NOT NULL,        -- intent-typer som routar hit
  tools TEXT[],                    -- tillåtna function names
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,     -- vid overlap, högre prio vinner
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage agent config"
  ON agent_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

**Registry 2.0: Dynamisk laddning**
```typescript
export async function loadAgentRegistry(supabase: any): Promise<void> {
  const { data: configs } = await supabase
    .from('agent_config')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  // Bygg intent → agent mapping från DB
  for (const config of configs || []) {
    for (const trigger of config.triggers) {
      INTENT_TO_AGENT[trigger] = config.agent_name;
    }
    // Registrera en DynamicAgent med config.system_prompt
    agents[config.agent_name] = new DynamicAgent(config);
  }
}
```

**DynamicAgent** — generisk agent som drivs av DB-config:
```typescript
class DynamicAgent implements Agent {
  constructor(private config: AgentConfig) {}
  name = this.config.agent_name;

  async execute(ctx: AgentContext): Promise<AgentResult> {
    // Filtrera tools baserat på config.tools
    const allowedTools = FUNCTION_DEFINITIONS.filter(
      t => this.config.tools?.includes(t.function.name)
    );
    // Anropa AI med config.system_prompt + kontext
    const data = await aiComplete(ctx.aiConfig, {
      messages: [
        { role: 'system', content: this.config.system_prompt + '\n\n' + buildContext(ctx) },
        ...buildHistory(ctx),
        { role: 'user', content: ctx.message }
      ],
      tools: allowedTools.length > 0 ? allowedTools : undefined,
      tool_choice: allowedTools.length > 0 ? 'auto' : undefined,
    });
    // ... hantera tool calls och returnera AgentResult
  }
}
```

### Framtida agenter (exempel)
- **ComplianceAgent** — Varnar för regelbrott, kontrollerar aging, föreslår korrigeringsverifikationer
- **ImportAgent** — Hanterar CSV/Excel-import, SIE-filer, bankutdrag
- **OnboardingAgent** — Guidad setup för nya användare (kontoplan, IB, första bokföring)

---

## Implementationsordning

```text
Steg 2a: Per-agent loggning (lågt risk, hög synlighet)
  - Skapa agent_logs tabell
  - Implementera logger.ts
  - Integrera i orchestrator
  - Visa i admin UI

Steg 2b: Admin-UI för prompter (lågt risk, hög användbarhet)
  - Lägg till agent_prompt_* nycklar i system_settings
  - Skapa AdminAgents.tsx
  - Dynamisk prompt-laddning i agenter

Steg 2c: Agent-to-Agent konsultation (medium risk)
  - Utöka AgentContext med consult()
  - Implementera i registry
  - Testa med booking → advisory use case

Steg 2d: Dynamisk agent-registrering (hög risk, hög belöning)
  - Skapa agent_config tabell
  - Implementera DynamicAgent
  - Migrera befintliga agenter till DB-config
  - Admin-UI för att skapa/redigera agenter
```

## Sammanfattning

Steg 2 transformerar Air från ett statiskt agent-system till en dynamisk plattform:
- **Konsultation** gör agenter smartare genom samarbete
- **Admin-prompter** ger kontroll utan kodändringar
- **Loggning** ger synlighet och möjlighet att optimera
- **Dynamisk registrering** gör det möjligt att lägga till nya agenter utan deploy
