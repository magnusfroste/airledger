

# Intent Router 2.0: Ekonomiassistenten
## Med insikter fran Puzzle.io, batch-bildtolkning och audit trail

---

## Oversikt

En fullstandig refaktorering av `chat-assistant` fran en monolitisk AI-funktion till en moduler **Intent Router-arkitektur** som separerar forstaelse (AI) fran exekvering (deterministisk kod). Inkluderar stod for bankutdragsbilder med flerradstolkning och en append-only audit trail inspirerad av Puzzle.io.

---

## Fas 1: Intent Router-karna

### 1.1 Ny fil: `intent-classifier.ts`

Erstatter dagens tunga system-prompt (152 rader, ~2000 tokens per anrop) med en latt klassificering som returnerar strukturerad JSON.

**Vad den gor:**
- Tar emot anvandarens meddelande + en kort lista av tillgangliga mallnamn
- Anropar Lovable AI Gateway (istallet for direkt OpenAI) med `response_format: { type: "json_object" }`
- Returnerar strukturerat intent-objekt:

```text
{
  intent: "book_expense" | "book_sale" | "book_payment" | 
          "opening_balance" | "confirm_booking" | "ask_question" | 
          "view_report" | "analyze_image" | "unknown",
  extracted_data: {
    amount, date, description, vendor, 
    vat_rate, reference, payment_method
  },
  matched_template_hint: "Lokalhyra",
  confidence: 0.92,
  clarification_needed: null | "Ar beloppet inkl eller exkl moms?"
}
```

- System-prompten: ~200 tokens istallet for ~2000
- Ingen kontoplan, inga malldetaljer, inga bokforingsregler

### 1.2 Ny fil: `template-matcher.ts`

Deterministisk mallmatchning i kod istallet for AI-gissning.

**Matchningslogik (i prioritetsordning):**
1. Exakt match pa `matched_template_hint` fran intent-klassificeraren
2. Kategori-match (intent-kategori mot mallkategori)
3. Keyword-match (extraherade nyckelord mot mallens `keywords`-array)
4. Fallback: returnera topp 3 kandidater for anvandaren att valja

**Databasefragor:** Hämtar mallar fran `airledger_transaction_templates` med enkel `select` baserat pa matchning - inget AI-anrop.

### 1.3 Ny fil: `response-formatter.ts`

Genererar svarstext med ren kodlogik - inget AI-anrop.

**Funktioner:**
- `formatBookingProposal(template, amount, date)` - Visar debet/kredit-poster med belopp
- `formatConfirmation(transaction)` - Bekraftelse efter bokforing
- `formatClarificationRequest(question)` - Staller en foljdfragaolla
- `formatBatchProposal(rows[])` - For bankutdrag med flera rader

Exempel-output:
```text
Jag tolkar det som lokalhyra. Forslaget:

| Konto         | Debet    | Kredit   |
|---------------|----------|----------|
| 5010 Lokalhyror | 8 000 kr |          |
| 1930 Foretagskonto |      | 8 000 kr |

Datum: 2026-02-13

Ska jag bokfora detta?
```

### 1.4 Refaktorerad: `context-builder.ts`

Tva lagan istallet for en:

- **Light mode** (for intent-klassificering): Bara mallnamn och kategorier (~100 tokens)
- **Full mode** (for fragor/rapporter): Allt som idag (~800 tokens)

### 1.5 Refaktorerad: `index.ts` (huvudflodet)

Ny router-logik:

```text
Meddelande in
    |
    v
Intent Classifier (latt AI-call)
    |
    +-- book_expense/sale/payment --> Template Matcher --> Response Formatter --> [Vanta pa bekraftelse]
    |
    +-- confirm_booking --> Execution (use-transaction-template / save-general-transaction)
    |
    +-- analyze_image --> Bildanalys-pipeline (se Fas 2)
    |
    +-- ask_question/view_report --> Full AI-call med komplett kontext (som idag)
    |
    +-- unknown --> AI fritext-svar med fallback
```

### 1.6 Refaktorerad: `system-prompt.ts`

Krymps fran 152 rader till ~30 rader. Fokuserar ENBART pa intent-klassificering:
- "Du ar en svensk bokforingsassistent. Klassificera anvandarens avsikt och extrahera data."
- Lista mojliga intents
- Inga bokforingsregler, inga kontonummer, inga malldetaljer

### 1.7 Andrad: `function-definitions.ts`

Tas bort eller forenklas kraftigt. Function calling ersatts av structured JSON output fran intent-klassificeraren. Exekveringen sker direkt i router-logiken baserat pa intent.

---

## Fas 2: Bankutdragsbilder (batch-tolkning)

### 2.1 Ny fil: `bank-statement-analyzer.ts`

Hanterar bilder pa bankutdrag med flera transaktionsrader.

**Flode:**
1. AI Vision (via Lovable AI Gateway med `google/gemini-2.5-flash`) analyserar bilden
2. Returnerar strukturerad array:

```text
{
  document_type: "bank_statement",
  account_name: "Foretagskonto 1930",
  period: "2026-01-01 till 2026-01-31",
  rows: [
    { date: "2026-01-02", description: "Telia faktura", amount: -599, balance: 49401 },
    { date: "2026-01-05", description: "Hyra kontor", amount: -8000, balance: 41401 },
    { date: "2026-01-10", description: "Kundbetalning Acme AB", amount: 15000, balance: 56401 }
  ]
}
```

3. Varje rad skickas genom intent-klassificeraren for kategorisering
4. Template-matcher hittar ratt mall for varje rad
5. Allt presenteras i en batch-oversikt for bekraftelse

### 2.2 Refaktorerad: `analyze-receipt/index.ts`

Uppdateras for att stodja bade enskilda kvitton OCH bankutdrag:
- Detekterar dokumenttyp (kvitto vs bankutdrag) fran bilden
- For kvitton: befintligt flode
- For bankutdrag: delegerar till `bank-statement-analyzer.ts`

### 2.3 Frontend: Batch-bekraftelse

`TransactionConfirmDialog` utvidgas (eller ny komponent `BatchConfirmDialog`):
- Visar alla tolkade rader i en tabell
- Anvandaren kan redigera/ta bort enskilda rader
- "Bokfor alla" eller "Bokfor valda"
- Rader som AI:n inte kan klassificera markeras med gult for manuell kategorisering

---

## Fas 3: Append-Only Audit Trail (inspirerat av Puzzle.io)

### 3.1 Ny databastabell: `airledger_audit_log`

```text
Kolumner:
- id (uuid, PK)
- user_id (uuid)
- action_type (text): "transaction_created", "transaction_modified", "ai_classification", "user_confirmed", "template_matched"
- entity_type (text): "transaction", "entry", "opening_balance"
- entity_id (uuid): referens till den paverkade posten
- before_state (jsonb): tillstand fore andring (null for nya)
- after_state (jsonb): tillstand efter andring
- ai_metadata (jsonb): intent, confidence, model, tokens_used
- source (text): "chat", "receipt_scan", "bank_statement", "manual"
- created_at (timestamptz)
```

**RLS-policy:** Anvandare kan bara lasa sina egna loggar.

### 3.2 Integration med routern

Varje steg i intent-routern loggas:
- Intent-klassificering: vad AI:n tolkade, confidence-niva
- Mallmatchning: vilken mall som valdes och varfor
- Anvandarbekraftelse: om anvandaren andrade nagot
- Exekvering: slutligt resultat

### 3.3 Frontend: Revisionslogg-vy

Enkel tidslinje-komponent som visar historik for varje transaktion:
- "AI tolkade som: Lokalhyra (92% sakerhet)"
- "Matchade mall: Lokalhyra"
- "Anvandaren bekraftade utan andringar"
- "Transaktion bokford"

---

## Fas 4: Migrera till Lovable AI Gateway

### 4.1 Ersatt OpenAI direkt-anrop

Alla AI-anrop i `chat-assistant` och `analyze-receipt` migreras fran:
- `OpenAI({ apiKey: OPENAI_API_KEY })` direkt
  
Till:
- `fetch("https://ai.gateway.lovable.dev/v1/chat/completions")` med `LOVABLE_API_KEY`

### 4.2 Modellval

- **Intent-klassificering:** `google/gemini-3-flash-preview` (snabb, billig)
- **Bankutdragsanalys (vision):** `google/gemini-2.5-flash` (bra pa bilder)
- **Fragor/rapporter (full kontext):** `google/gemini-3-flash-preview`
- **Kvittoanalys (vision):** `google/gemini-2.5-flash`

### 4.3 Streaming for fragor

For `ask_question`-intents aktiveras SSE-streaming sa anvandaren ser svaret token-for-token. Bokforingsflodet behover inte streaming (deterministiskt svar).

---

## Sammanfattning av filandringar

### Nya filer:
| Fil | Beskrivning |
|-----|-------------|
| `supabase/functions/chat-assistant/intent-classifier.ts` | Latt AI intent-klassificering |
| `supabase/functions/chat-assistant/template-matcher.ts` | Deterministisk mallmatchning |
| `supabase/functions/chat-assistant/response-formatter.ts` | Kodgenererade svar |
| `supabase/functions/chat-assistant/bank-statement-analyzer.ts` | Batch-tolkning av bankutdrag |
| `src/components/BatchConfirmDialog.tsx` | UI for flerradbekraftelse |

### Andrade filer:
| Fil | Andring |
|-----|---------|
| `supabase/functions/chat-assistant/index.ts` | Ny router-logik, Lovable AI Gateway |
| `supabase/functions/chat-assistant/system-prompt.ts` | Kraftigt forminskad (~30 rader) |
| `supabase/functions/chat-assistant/context-builder.ts` | Light/full mode |
| `supabase/functions/chat-assistant/function-definitions.ts` | Forenklas/tas bort |
| `supabase/functions/chat-assistant/data-fetcher.ts` | Lazy loading av data |
| `supabase/functions/chat-assistant/types.ts` | Nya typer for intents |
| `supabase/functions/analyze-receipt/index.ts` | Stod for bankutdrag, Lovable AI |
| `src/components/ChatInterface.tsx` | Stod for batch-bekraftelse och streaming |
| `src/hooks/useReceiptAnalysis.ts` | Hantera bankutdrag |

### Ny databasmigration:
- Tabell `airledger_audit_log` med RLS-policy

---

## Forvantat resultat

| Metric | Idag | Efter |
|--------|------|-------|
| Tokens per bokforing | ~3000 | ~400 |
| AI-anrop per bokforing | 1 tungt | 1 latt |
| Mallmatchning | AI-gissning | Deterministisk |
| Bankutdrag | Ej stod | Batch-tolkning |
| Revisionslogg | Ingen | Komplett |
| Modell | OpenAI direkt | Lovable AI Gateway |
| Streaming | Nej | Ja (for fragor) |

---

## Implementeringsordning

1. **Fas 1** (Intent Router) - Grundarkitekturen
2. **Fas 4** (Lovable AI) - Migrering till gateway (gor parallellt med Fas 1)
3. **Fas 3** (Audit Trail) - Databasmigration + loggning
4. **Fas 2** (Bankutdrag) - Batch-bildtolkning

Fas 1 och 4 kan implementeras samtidigt. Fas 3 ar en oberoende databasandring. Fas 2 bygger pa att Fas 1 ar klar.

