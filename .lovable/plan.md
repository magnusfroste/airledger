

# Admin Triggers -- dynamisk hantering av deadlines och paminningar

## Oversikt

Istallet for att hardkoda svenska skattedatum skapar vi en ny **Admin Triggers**-flik i adminpanelen. Varje trigger ar en databasrad som beskriver **vad** som ska handa, **nar** det ska handa, och **vilken knapp** som visas i chatten. Systemet fungerar som en enkel cron-liknande motor -- men drivet av data i databasen, inte av kod.

Fas 1 (denna plan) fokuserar pa CRUD i admin + att ChatQuickActions laser triggersen. Fas 2 (framtida) kan lagga till en riktig cron-edge-function som skickar notiser/push.

## Datamodell

Ny tabell `air_triggers`:

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| id | uuid PK | |
| name | text | T.ex. "Momsdeklaration Q1" |
| description | text | Forklaringstext |
| trigger_type | text | `recurring_yearly` / `recurring_quarterly` / `one_time` |
| month | int | Manad (1-12) for arlig, startmanad for kvartalsvis |
| day | int | Dag i manaden |
| days_before | int | Visa knappen X dagar fore deadline (default 14) |
| quick_action_label | text | Knapptext, t.ex. "Momsrapport Q1" |
| quick_action_message | text | Meddelandet som skickas till chatten |
| is_active | boolean | Pa/av |
| priority | int | Hogre = visas forst |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Forpopuleras med svenska standarddatum (momsdeklarationer, inkomstdeklaration, arsredovisning) men allt ar redigerbart.

## Admin-granssnitt

Ny flik **Triggers** i adminpanelen med ikon `Clock` (lucide). Visar:

1. **Lista** over alla triggers med toggle for aktiv/inaktiv
2. **Lagg till / redigera** -- formular med alla falt
3. **Forhandsvisning** -- "Nasta gang denna trigger visas: [datum]"
4. **Ta bort** med bekraftelse

## ChatQuickActions-koppling

`useQuickActionContext`-hooken hamtar aktiva triggers fran `air_triggers` och beraknar vilka som ar "varma" (inom `days_before` fran nasta forekomst). Dessa injiceras i prioritetsordningen fran det tidigare forslaget, pa plats 3 (DEADLINE-DRIVEN), men nu databas-drivet.

## Tekniska forandringar

### 1. Databasmigration
- Skapa tabellen `air_triggers`
- RLS: Lasbar for alla autentiserade, skrivbar for admin (via `has_role`)
- Seed-data: 6 triggers (4 kvartalsmoms + inkomstdeklaration + arsredovisning)

### 2. Ny komponent: `src/components/admin/AdminTriggers.tsx`
- CRUD-lista med inline-toggle for `is_active`
- Dialog for lagg till / redigera
- Berakning av "nasta forekomst" for forhandsvisning
- Foljder samma monster som `AdminWarningRules` / `AdminAgents`

### 3. Uppdatera: `src/pages/Admin.tsx`
- Lagg till 10:e flik "Triggers" med `Clock`-ikon
- Uppdatera grid fran `grid-cols-9` till `grid-cols-10`

### 4. Ny hook: `src/hooks/useQuickActionContext.ts`
- Hamtar transaktionsantal, IB-antal, topp-mallar **och** aktiva triggers
- Beraknar vilka triggers som ar "varma" (inom deadline-fonster)
- Returnerar `{ transactionCount, hasOpeningBalances, topTemplates, activeTriggers, isLoading }`

### 5. Uppdatera: `src/components/chat/ChatQuickActions.tsx`
- Tar emot `activeTriggers` via props
- Infogar deadline-knappar pa prioritet 3 i vattenfallet
- `prominent: true` om deadline ar inom 7 dagar

### 6. Uppdatera: `src/components/chat/InputArea.tsx` och `src/components/ChatInterface.tsx`
- Skickar ner kontextdata till ChatQuickActions

## Seed-data (6 triggers)

| Namn | Typ | Manad | Dag | Dagar fore | Knapptext |
|------|-----|-------|-----|------------|-----------|
| Momsdeklaration Q4 | recurring_yearly | 1 | 12 | 14 | Momsrapport Q4 |
| Momsdeklaration Q1 | recurring_yearly | 4 | 12 | 14 | Momsrapport Q1 |
| Momsdeklaration Q2 | recurring_yearly | 7 | 12 | 14 | Momsrapport Q2 |
| Momsdeklaration Q3 | recurring_yearly | 10 | 12 | 14 | Momsrapport Q3 |
| Inkomstdeklaration | recurring_yearly | 5 | 2 | 30 | Deklaration |
| Arsredovisning | recurring_yearly | 2 | 28 | 30 | Bokslut |

## Framtida utbyggnad (inte i denna fas)

- **Cron edge function**: Kor dagligen, skickar notiser/push for triggers inom deadline-fonster
- **Per-anvandare triggers**: Anpassade paminningar baserat pa foretag (t.ex. brutet rakenskapsar)
- **Trigger-historik**: Logga nar en trigger "triggas" och om anvandaren agerade pa den

