

# Utvidga AI-assistenten Air med moms, avstämning och bokslut

## Sammanfattning
Utvidga assistenten Air från enkel transaktionsbokforing till att stodja momsrapporter, periodavstemningar och arsbokslut. Lagg till kontextuella snabbknappar i chatten som anpassas efter vad anvandaren behover just nu.

## 1. Nya intent-typer i Intent Router

Lagg till foljande intents i `intent-classifier.ts`:

| Intent | Trigger-fraser | Vad den gor |
|--------|---------------|-------------|
| `vat_report` | "momsrapport", "moms kvartal", "momsdeklaration", "redovisa moms" | Beraknar utgaende vs ingaende moms for vald period |
| `period_reconciliation` | "avstamning", "stammer kontot", "kontrollera", "periodavstemning" | Jamfor IB + transaktioner mot forvantad UB for ett konto |
| `year_end` | "arsbokslut", "stang aret", "bokslut", "arsredovisning" | Guidar genom bokslutsprocessen steg for steg |
| `account_balance` | "saldo pa", "vad star det pa", "hur mycket finns" | Visar aktuellt saldo for ett specifikt konto |

## 2. Backend: Nya berakningsfunktioner

### 2a. Momsberakning (i `data-fetcher.ts` + ny handler)
- Hamta alla entries pa momskonton (2610-2650) for angiven period
- Berakna: Utgaende moms (2610/2611) - Ingaende moms (2640/2641)
- Returnera formaterad sammanfattning med nettomoms att betala/fa tillbaka
- Ingen ny edge function -- berakningen gors i `chat-assistant` med befintlig data

### 2b. Kontosaldo / Periodavstemning
- Berakna: IB + debet - kredit = saldo for givet konto och period
- Anvand `airledger_opening` + `airledger_entries` filtrerat pa `transaction_date`
- Visa i tabellformat: IB, rorelse under perioden, UB

### 2c. Arsbokslutsguid
- Stegvis konversationsflode:
  1. "Har du bokfort alla transaktioner for 2025?" 
  2. Visa checklista: avskrivningar, periodiseringar, skatteavsattning
  3. Visa resultatrakning och balansrakning for aret
  4. Erbjud att lasa rakenskapsaret (nar steg 4 i plan.md ar implementerat)

## 3. Nya function definitions

Lagg till i `function-definitions.ts`:
- `calculate_vat_report` -- parametrar: `periodStart`, `periodEnd`
- `calculate_account_balance` -- parametrar: `accountCode`, `periodStart`, `periodEnd`
- `get_year_end_checklist` -- parametrar: `fiscalYear`

Dessa funktioner kor deterministisk SQL (inga AI-hallucinationer i siffror).

## 4. Kontextuella snabbknappar i chatten

### 4a. Quick Suggestions-komponent
Ny komponent `ChatQuickActions.tsx` som visar horisontellt scrollbara knappar ovanfor textfaltet. Knapparna andras baserat pa kontext:

**Standardlage (tom chatt / efter bokning):**
- "Bokfor utgift" 
- "Momsrapport Q{current}" 
- "Kontosaldo"
- "Avstamning"

**Efter bokforing:**
- "Bokfor en till"
- "Visa saldo"
- "Tillbaka till dashboard"

**Vid kvartalsskifte (jan, apr, jul, okt):**
- "Momsrapport Q{prev}" visas prominent

**Vid arsskifte (jan-feb):**
- "Paborja bokslut {prev year}" laggs till

### 4b. Implementation
- Knapparna skickar fordefinierade meddelanden via `onAction`-callbacken som redan finns
- Renderas i `InputArea.tsx` ovanfor ActionButtons
- Stiliserade som pills/chips (Apple-inspirerat, avrundade, minimal)

## 5. Uppdatera system-prompt

Lagg till instruktioner i `system-prompt.ts`:
- Moms: "Nar anvandaren fragar om moms, berakna fran konton 2610-2650"
- Avstamning: "Visa alltid IB + rorelse + UB i tabellformat"
- Bokslut: "Guid anvandaren steg for steg, fraga aldrig om allt pa en gang"

## 6. Uppdatera context-builder

Lagg till i `data-fetcher.ts`:
- Hamta aggregerade momssiffror for innevarande kvartal (effektivt, en query)
- Skicka med som del av kontexten sa AI:n har siffrorna redo

---

## Tekniska detaljer

### Filandringar:
1. `supabase/functions/chat-assistant/intent-classifier.ts` -- Lagg till 4 nya intent-typer i enum och klassificeringsregler
2. `supabase/functions/chat-assistant/function-definitions.ts` -- 3 nya funktioner
3. `supabase/functions/chat-assistant/function-handlers.ts` -- Hanterare for nya funktioner (SQL-berakningar)
4. `supabase/functions/chat-assistant/data-fetcher.ts` -- Ny `fetchVatSummary()` och `fetchAccountBalance()`
5. `supabase/functions/chat-assistant/context-builder.ts` -- Inkludera momssammanfattning i kontext
6. `supabase/functions/chat-assistant/index.ts` -- Nya routing-cases
7. `supabase/functions/chat-assistant/system-prompt.ts` -- Utokade instruktioner
8. `supabase/functions/chat-assistant/types.ts` -- Uppdatera IntentClassification med nya typer
9. `src/components/chat/ChatQuickActions.tsx` -- Ny komponent for snabbknappar
10. `src/components/chat/InputArea.tsx` -- Integrera ChatQuickActions
11. `.lovable/plan.md` -- Uppdatera med dessa steg

### Ingen ny databastabell behovs
Allt beraknas fran befintliga `airledger_entries` och `airledger_opening`.

