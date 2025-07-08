# Air Ledger - AI-Driven Bokföring

Air Ledger är en AI-assisterad bokföringsapplikation byggd för svenska småföretag. Applikationen använder avancerad AI för att automatisera bokföring, analysera kvitton och ge personlig vägledning baserat på BAS-kontoplanen 2024.

## Översikt

Air Ledger kombinerar modern webbteknik med AI för att skapa en smidig bokföringsupplevelse:

- **AI-assistent**: Conversational AI som förstår svensk bokföring
- **Kvittoanalys**: Automatisk OCR och kategorisering av kvitton
- **Transaktionsmallar**: Återanvändbara mallar för vanliga transaktioner
- **BAS-kontoplanen 2024**: Fullständig implementation av svensk standard

## Teknisk Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI GPT-4 med funktionsanrop
- **Storage**: Supabase Storage för kvitton och bilder

## AI-Systemets Kärna

### System Prompt (`supabase/functions/chat-assistant/system-prompt.ts`)

AI-assistenten styrs av en omfattande system prompt som definierar:

- **Persona**: "Air Ledger Assistant" - specialist på svensk bokföring
- **Kunskaper**: BAS-kontoplanen 2024, svensk bokföringspraxis
- **Beslutsstuktur**: Regler för att välja rätt verktyg (tool) baserat på användarens input
- **Kommunikationsstil**: Vänlig, professionell, svenskspråkig

#### Viktiga delar av system prompt:

```typescript
// Beslutsstuktur för tool-val
När användaren nämner:
- "Ingående balans" / "Saldo på konto" → save_opening_balance
- "Jag har fakturerat" / "Skickat faktura" → save_invoice  
- "Fått betalning" / "Kund har betalat" → save_payment
- Vanliga kostnader (hyra, bankavgift, etc.) → use_transaction_template
- Komplexa transaktioner → save_general_transaction
```

### Tool Calling System

AI:n använder fem huvudsakliga funktioner för att utföra bokföringsoperationer:

#### 1. `save_opening_balance`
- **Syfte**: Registrera ingående balanser
- **Användning**: När användaren anger saldo på konton
- **Exempel**: "Jag har 50 000 kr på checkkontot"

#### 2. `save_invoice` 
- **Syfte**: Skapa utgående fakturor
- **Användning**: När användaren fakturerat en kund
- **Bokföring**: Automatisk 25% moms, skapar kundfordran
- **Exempel**: "Jag har fakturerat Acme AB 10 000 kr"

#### 3. `save_payment`
- **Syfte**: Registrera inbetalningar från kunder
- **Användning**: När kund betalat faktura
- **Bokföring**: Debet checkkonto, kredit kundfordran
- **Exempel**: "Acme AB har betalat 12 500 kr"

#### 4. `use_transaction_template`
- **Syfte**: Använd fördefinierade mallar för vanliga transaktioner
- **Användning**: Återkommande kostnader som hyra, bankavgifter
- **Fördel**: Snabb och konsekvent bokföring
- **Exempel**: "Betalat hyra 8 000 kr"

#### 5. `save_general_transaction`
- **Syfte**: Skapa komplexa eller specialiserade transaktioner
- **Användning**: Fallback för allt som inte passar andra tools
- **Flexibilitet**: Stöder flera bokföringsposter per transaktion
- **Exempel**: "Betalat faktura från leverantör med moms"

### Function Definitions (`supabase/functions/chat-assistant/function-definitions.ts`)

Varje tool definieras med:
- **Beskrivning**: När och hur verktyget ska användas
- **Parametrar**: Obligatoriska och valfria fält
- **Validering**: Datatyper och format

```typescript
{
  name: "use_transaction_template",
  description: "ANVÄND DENNA NÄR: Vanliga återkommande transaktioner...",
  parameters: {
    templateName: { type: "string" },
    amount: { type: "number" }, 
    description: { type: "string" },
    // ...
  }
}
```

## Transaktionsmallar - Hjärtat av Användarupplevelsen

### Vad är Transaktionsmallar?

Transaktionsmallar är fördefinierade bokföringsstrukturer som automatiserar vanliga transaktioner. De består av:

- **Mallnamn**: Beskrivande namn (t.ex. "Lokalhyra")
- **Kategori**: Gruppering för organisation
- **Bokföringsposter**: Fördefinierade debet/kredit-poster
- **Nyckelord**: För automatisk igenkänning
- **Metadata**: Återkommande frekvens, användarstatistik

### Mallstruktur i Databas

```sql
CREATE TABLE airledger_transaction_templates (
  id UUID PRIMARY KEY,
  template_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  template_entries JSONB NOT NULL, -- Bokföringsposter
  keywords TEXT[], -- För AI-matchning
  is_system_template BOOLEAN, -- Systemmallar vs användarskapade
  auto_suggest BOOLEAN, -- Föreslå automatiskt
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  -- ...
);
```

### Exempel på Mallstruktur

```json
{
  "template_name": "Lokalhyra",
  "description": "Månadsvis hyra för lokaler",
  "category": "Lokalkostnader", 
  "template_entries": [
    {
      "account_code": "6000",
      "account_name": "Lokalhyra", 
      "type": "debit",
      "description": "Hyra för lokaler"
    },
    {
      "account_code": "1930",
      "account_name": "Checkkonto",
      "type": "credit", 
      "description": "Betalning från bankkonto"
    }
  ],
  "keywords": ["hyra", "lokal", "kontor"],
  "is_system_template": true,
  "auto_suggest": true
}
```

## Hur Användare Skapar Mallar

### Via AI-Assistent (Rekommenderat)

1. **Naturlig dialog**: "Skapa en mall för månadsvis telefonräkning"
2. **AI föreslår struktur**: Baserat på BAS-kontoplanen
3. **Användarverifiering**: Kontrollera konton och belopp
4. **Automatisk sparning**: Mall sparas för framtida användning

### Via Mallhanteraren (`src/components/TemplateManager.tsx`)

1. **Grafiskt gränssnitt**: Formulär för mallskapande
2. **Kontoval**: Dropdown med BAS-kontoplanen
3. **Bokföringsposter**: Lägg till debet/kredit-rader
4. **Metadata**: Nyckelord, kategori, återkommande

```typescript
// Exempel på mallskapande via UI
const createTemplate = async (templateData: {
  templateName: string;
  description: string;
  category: string;
  entries: TemplateEntry[];
  keywords: string[];
}) => {
  // Validera bokföringsposter
  // Spara till databas
  // Uppdatera användargränssnitt
};
```

## Hur Utvecklare Skapar Systemmallar

### 1. Databas-Migration

```sql
-- Skapa systemmallar via SQL
INSERT INTO airledger_transaction_templates (
  template_name,
  description, 
  category,
  template_entries,
  keywords,
  is_system_template,
  auto_suggest,
  user_id
) VALUES (
  'Bankavgifter',
  'Månadsvis bankavgift',
  'Bankkostnader',
  '[
    {
      "account_code": "6830",
      "account_name": "Bankavgifter",
      "type": "debit"
    },
    {
      "account_code": "1930", 
      "account_name": "Checkkonto",
      "type": "credit"
    }
  ]'::jsonb,
  ARRAY['bank', 'avgift', 'månadsavgift'],
  true, -- Systemmallar
  true, -- Auto-förslag
  '00000000-0000-0000-0000-000000000000' -- System-användar-ID
);
```

### 2. Seed-Script för Standardmallar

```typescript
// Skapa standardmallar programmatiskt
const systemTemplates = [
  {
    name: "Preliminärskatt betalning",
    category: "Skatter",
    entries: [
      { account: "2510", name: "Skulder skatter och avgifter", type: "debit" },
      { account: "1930", name: "Checkkonto", type: "credit" }
    ],
    keywords: ["skatt", "preliminärskatt", "månadsvis"]
  },
  // Fler standardmallar...
];
```

### 3. AI-Systemets Mallhantering

I system prompt definieras vilka mallar som ska användas automatiskt:

```typescript
// Från system-prompt.ts
✅ ANVÄND MALLAR FÖR DESSA VANLIGA TRANSAKTIONER:
- "Lokalhyra" - när användaren nämner hyra för lokaler
- "Bankavgifter" - för bankavgifter och bankkostnader  
- "Kontorsmaterial" - för kontorsmaterial och utrustning
- "Drivmedel/Bensin" - för bensin, diesel, drivmedel
// ...
```

## Edge Functions - Backend Logic

### Chat Assistant (`supabase/functions/chat-assistant/`)

Huvudfunktionen som hanterar AI-kommunikation:

```typescript
// Processflöde
1. Ta emot användarmeddelande
2. Bygg kontext (tidigare transaktioner, mallar)
3. Skicka till OpenAI med system prompt
4. Tolka AI-svar och funktionsanrop
5. Utför bokföringsoperationer
6. Returnera svar till användaren
```

### Mallhantering (`supabase/functions/use-transaction-template/`)

Specifik funktion för att använda mallar:

```typescript
// Processflöde
1. Ta emot mallnamn och belopp
2. Hämta mall från databas
3. Generera bokföringsposter baserat på mall
4. Skapa transaktion via save-general-transaction
5. Registrera mallanvändning för statistik
```

## Resultatrapport - Tolkning av BAS-Kontoklasser

### Översikt

Resultatrapporten (`src/pages/Reports.tsx`) genererar en automatisk resultaträkning baserad på BAS-kontoplanen 2024. Rapporten använder specifika regler för att klassificera och beräkna intäkter och kostnader.

### Inkluderade Kontoklasser

#### Intäktskonton (3000-3999)
- **Normal balans**: Kredit
- **Beräkning**: Kredit - Debit = Nettointäkt
- **Exempel**: 
  - 3000 Försäljning varor
  - 3100 Tjänsteintäkter
  - 3200 Hyresintäkter

#### Kostnadskonton (4000-4999 & 6000-6999)
- **Normal balans**: Debit
- **Beräkning**: Debit - Kredit = Nettokostnad
- **Exempel**:
  - 4000 Inköp varor
  - 6000 Lokalhyra
  - 6250 Telekommunikation
  - 6830 Bankavgifter

### Exkluderade Kontoklasser

Följande konton visas **INTE** i resultatrapporten:

- **1000-2999**: Balansräkningskonton (tillgångar och skulder)
- **5000-5999**: Finansiella poster och extraordinära poster
- **7000-8999**: Koncern- och övriga poster

### Beräkningslogik

```typescript
// Pseudokod för rapportlogik
const revenue = accounts
  .filter(account => account.code >= 3000 && account.code <= 3999)
  .map(account => ({
    ...account,
    total: account.credit_total - account.debit_total
  }))
  .filter(account => account.total !== 0);

const expenses = accounts
  .filter(account => 
    (account.code >= 4000 && account.code <= 4999) ||
    (account.code >= 6000 && account.code <= 6999)
  )
  .map(account => ({
    ...account,
    total: account.debit_total - account.credit_total
  }))
  .filter(account => account.total !== 0);

const netResult = totalRevenue - totalExpenses;
```

### Praktiska Exempel

#### ✅ Transaktioner som Visas i Rapporten

```javascript
// Intäktstransaktion
Debet: 1930 Checkkonto         10,000 kr
Kredit: 3000 Försäljning        10,000 kr
// → Visas som +10,000 kr intäkt

// Kostnadstransaktion
Debet: 6000 Lokalhyra           8,000 kr
Kredit: 1930 Checkkonto         8,000 kr
// → Visas som +8,000 kr kostnad
```

#### ❌ Transaktioner som INTE Visas

```javascript
// Balansräkningstransaktion
Debet: 1510 Kundfordringar      5,000 kr
Kredit: 1930 Checkkonto         5,000 kr
// → Visas INTE (endast balansräkningskonten)

// Lånetransaktion
Debet: 1930 Checkkonto          50,000 kr
Kredit: 2330 Banklån            50,000 kr
// → Visas INTE (endast balansräkningskonten)
```

### Felsökning

#### Saknas Transaktioner i Rapporten?

1. **Kontrollera kontokod**: Är det 3000-3999 eller 4000-4999/6000-6999?
2. **Kontrollera datumperiod**: Är transaktionen inom vald tidsperiod?
3. **Kontrollera nollbalans**: Konton med nollsaldo visas inte
4. **Kontrollera bokföring**: Är debet/kredit korrekt bokförda?

#### Felaktiga Belopp?

- **Negativa intäkter**: Kontrollera att kreditposter är större än debetposter på intäktskonton
- **Negativa kostnader**: Kontrollera att debetposter är större än kreditposter på kostnadskonton

### Rapportperioder

Rapporten stöder följande perioder:
- **Innevarande månad**: Från månadens första dag
- **Föregående månad**: Hela föregående månad
- **Innevarande år**: Från årets första dag
- **Föregående år**: Hela föregående år

### Export-funktionalitet

Rapporten kan exporteras som CSV-fil med:
- Detaljerade kontouppgifter
- Summering per kategori
- Nettoresultat
- Tidsperiod och genereringsdatum

## Användningsstatistik och Analytics

### Mallstatistik

Systemet spårar automatiskt:
- **Användningsfrekvens**: Hur ofta varje mall används
- **Senaste användning**: Timestamp för senaste användning
- **Populära mallar**: För att förbättra AI-förslag

### Implementering

```sql
-- Trigger som uppdaterar statistik automatiskt
CREATE OR REPLACE FUNCTION update_template_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE airledger_transaction_templates 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NEW.used_at
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Utveckling och Deployment

### Lokal utveckling

```bash
# Installera dependencies
npm install

# Starta utvecklingsserver
npm run dev

# Starta Supabase lokalt (valfritt)
supabase start
```

### Edge Functions

Edge functions deployeras automatiskt när kod uppdateras. För lokal testning:

```bash
# Kör edge function lokalt
supabase functions serve chat-assistant

# Testa med curl
curl -X POST http://localhost:54321/functions/v1/chat-assistant \
  -H "Content-Type: application/json" \
  -d '{"message": "Betalat hyra 8000 kr"}'
```

### Databas-migrations

```bash
# Skapa ny migration
supabase migration new add_new_template_feature

# Tillämpa migrations
supabase db push
```

## Bidra till Projektet

### Lägg till Nya Mallar

1. Identifiera vanliga transaktioner
2. Definiera korrekta BAS-konton
3. Skapa mall i systemet
4. Uppdatera AI system prompt
5. Testa med olika användarinput

### Förbättra AI-Logik

1. Uppdatera system prompt för nya scenarion
2. Lägg till nya function definitions
3. Implementera nya edge functions
4. Testa med verkliga användardialoguer

### Rapportera Buggar

Använd GitHub Issues för att rapportera:
- AI-misstag i kontoklassificering
- Mallfel eller saknade mallar
- Bokföringsfel
- Användbarhetsproblem

## Licens

Detta projekt är utvecklat som en del av Lovable-plattformen.
