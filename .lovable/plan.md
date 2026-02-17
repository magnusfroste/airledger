

# Agent Separation of Concerns -- Air 2.0

## Problemanalys

Idag lever all logik i en enda `chat-assistant/index.ts` (722 rader) som agerar som router, bokföringsexpert, momsrådgivare, bokslutsguide och konversationshanterare samtidigt. System-prompten är överbelastad med domänkunskap (moms, skatt, årsbokslut, avskrivningar) som gör det svårt för AI:n att konsekvent välja rätt beteende.

Konsekvenser:
- Air "tappar tråden" i flerstegsflöden
- Mallmatchning misslyckas vid tvetydig input
- Svårt att testa enskilda förmågor isolerat
- Ny funktionalitet kräver att man rör "allt"

## Inspiration fran OpenClaw

Relevanta mönster fran OpenClaw:

1. **Gateway som control plane** -- en central router som delegerar till specialiserade agenter
2. **Agent-to-Agent (sessions_send)** -- agenter kan konsultera varandra
3. **Skills-plattform** -- avgränsade förmågor med egna prompter och verktyg
4. **Session isolation** -- varje agent har sin egen kontext och minne

## Föreslagen arkitektur

Tre lager istället för ett:

```text
Användare
    |
    v
[Orchestrator]  <-- Air (konversation + routing)
    |
    +---> [Booking Agent]     -- mallmatchning, fältinsamling, bokföring
    +---> [Reporting Agent]   -- moms, saldo, avstämning, bokslut
    +---> [Advisory Agent]    -- frågor, rådgivning, pedagogik
```

### Lager 1: Orchestrator (Air)
- **Ansvar**: Forstå vad användaren vill, delegera till rätt agent, presentera svar
- **Prompt**: Kort, fokuserad på konversation och routing
- **Äger**: Konversationshistorik, användarkontext, kvothantering

### Lager 2: Specialist-agenter (deterministiska)
Varje agent är en TypeScript-modul med:
- Eget system-prompt (kort, domänspecifikt)
- Egna verktyg/funktioner
- Egen kontextbyggare (laddar bara relevant data)
- Testbara via Deno-tester

### Lager 3: Gemensam plattform (_shared/)
- AI-klient, mallmatchning, kontextbygge (redan finns)
- Ny: Agent-registrering och resultat-kontrakt

## Detaljerad design

### Fil: `agents/registry.ts`
Centralt register över tillgängliga agenter:

```text
booking-agent
  triggers: book_expense, book_sale, book_payment, confirm_booking, opening_balance
  tools: use_transaction_template, save_general_transaction, save_opening_balance
  context: templates + financial snapshot

reporting-agent
  triggers: vat_report, account_balance, period_reconciliation, year_end, view_report
  tools: calculate_vat_report, calculate_account_balance, get_year_end_checklist, generate_year_end_summary
  context: full bookkeeping context

advisory-agent
  triggers: ask_question, unknown
  tools: (inga -- ren AI-konversation)
  context: full bookkeeping context
```

### Fil: `agents/booking-agent.ts`
- Tar emot: intent + extracted_data + templates + conversationHistory
- Hanterar: mallmatchning, fältinsamling, bokföringsförslag, bekräftelse
- Returnerar: strukturerat `AgentResult` (inte fri text)
- Eget system-prompt: Bara bokföringsregler, inget om moms/bokslut
- Flyttar hit: all logik fran `case 'book_expense'` och `case 'confirm_booking'`

### Fil: `agents/reporting-agent.ts`
- Tar emot: intent + extracted_data + fullContext
- Hanterar: momsrapporter, saldoberäkningar, årsbokslut
- Eget system-prompt: Bara rapporteringsregler
- Flyttar hit: all logik fran `case 'vat_report'`, `case 'year_end'`, etc.

### Fil: `agents/advisory-agent.ts`
- Tar emot: message + conversationHistory + fullContext
- Hanterar: frågor om bokföring, pedagogisk coachning
- Eget system-prompt: Fokuserat på att vara en pedagogisk bokföringscoach
- Flyttar hit: `handleFullAICall`

### Kontrakt: `AgentResult`

```text
interface AgentResult {
  response: string           -- Svarstext till användaren
  action_taken?: string      -- "booked", "proposed", "answered", "guided"
  data?: Record<string,any>  -- Strukturerad data (t.ex. bokförda poster)
  follow_up_agent?: string   -- Om en annan agent bör konsulteras härnäst
  context_markers?: string[] -- Metadata för nästa tur
}
```

### Uppdaterad `index.ts` (Orchestrator)
Krymper fran ~720 rader till ~150:

```text
1. Autentisera + kvot
2. Hämta userData + aiConfig
3. Klassificera intent (oförändrat)
4. Detektera aktiv kontext (field collection, year-end)
5. Välj agent fran registry baserat på intent
6. Anropa agent.execute(intent, context)
7. Returnera AgentResult.response
```

## Testbarhet

Varje agent kan testas isolerat med Deno-tester:

```text
supabase/functions/chat-assistant/agents/__tests__/
  booking-agent.test.ts    -- "hyra 8000 kr" -> rätt mall, rätt belopp
  reporting-agent.test.ts  -- "momsrapport Q1" -> rätt period, rätt format
  advisory-agent.test.ts   -- "vad är moms?" -> pedagogiskt svar
```

Testscenarier:
- Mall med moms vs utan moms
- Flerstegsflöde (fältinsamling)
- Tvetydiga belopp (inkl/exkl moms)
- Årsbokslut steg-för-steg
- Kontextbyte mitt i konversation

## Migrationsstrategi

Steg 1 (denna implementation):
- Skapa agent-ramverket (registry, kontrakt, basstruktur)
- Flytta booking-logik till booking-agent
- Flytta reporting-logik till reporting-agent
- Flytta advisory-logik till advisory-agent
- Refaktorera index.ts till orchestrator
- Separera system-prompter per agent

Steg 2 (framtida):
- Agent-to-agent-kommunikation (t.ex. booking-agent frågar advisory-agent om momsregler)
- Admin-UI för att konfigurera agenter och deras prompter
- Per-agent-loggning och prestandamätning
- Möjlighet att lägga till nya agenter utan att röra orchestratorn

## Tekniska detaljer

### Nya filer

```text
supabase/functions/chat-assistant/
  agents/
    types.ts              -- AgentResult, AgentContext, AgentConfig
    registry.ts           -- Agent-registrering och routing
    booking-agent.ts      -- Bokföringslogik
    reporting-agent.ts    -- Rapporterings- och bokslutslogik  
    advisory-agent.ts     -- Rådgivning och frågor
    prompts/
      booking.ts          -- System-prompt för bokföring
      reporting.ts        -- System-prompt för rapportering
      advisory.ts         -- System-prompt för rådgivning
```

### Modifierade filer

```text
supabase/functions/chat-assistant/
  index.ts                -- Krymps till orchestrator (~150 rader)
  system-prompt.ts        -- Behålls som fallback, men varje agent har egen prompt
```

### Ingen ändring

```text
supabase/functions/chat-assistant/
  intent-classifier.ts    -- Oförändrad (redan bra separation)
  field-analyzer.ts       -- Oförändrad (används av booking-agent)
  response-formatter.ts   -- Oförändrad (används av booking-agent)
  function-handlers.ts    -- Oförändrad (används av alla agenter)
  deduplication.ts        -- Oförändrad
  types.ts                -- Utökas med AgentResult
```

## Sammanfattning

Denna refaktorering ger:
- **Tydlig separation** -- varje agent har ett avgränsat ansvar
- **Testbarhet** -- agenter kan testas isolerat med specifika scenarier
- **Skalbarhet** -- nya agenter kan läggas till utan att röra befintlig kod
- **Kortare prompter** -- varje agent får bara den domänkunskap den behöver
- **Bättre precision** -- mindre risk att AI:n "blandar ihop" bokföring med rådgivning
- **Synlighet** -- loggning per agent visar var problem uppstår

