# Air Ledger - Master Dokumentation

> **Version**: 1.2.0 | **Senast uppdaterad**: 2025-01-17 | **Status**: Aktuell

---

## 📋 Snabböversikt

Air Ledger är en AI-assisterad bokföringsapplikation för svenska småföretag som använder avancerad AI för att automatisera bokföring baserat på BAS-kontoplanen 2024.

### Kärnprinciper

1. **Single Source of Truth**: Alla konteringsförslag kommer från transaktionsmallar i databasen
2. **Mallbaserad Arkitektur**: Systemet bygger på fördefinierade mallar för konsistens
3. **Säkerhet Först**: Row Level Security (RLS) och proper autentisering
4. **Enkelhet först**: Tydlig data-model/view separering, "less is more"

### Teknisk Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI GPT-4 med Function Calling
- **Storage**: Supabase Storage

---

## 🏗️ Arkitektur

### Hög-nivå Översikt

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Supabase Edge  │    │   PostgreSQL    │
│                 │    │   Functions     │    │   Database      │
│  - Chat UI      │◄──►│                 │◄──►│                 │
│  - Dashboard    │    │  - Chat Assistant│    │  - Transactions │
│  - Reports      │    │  - Template Engine│    │  - Templates    │
│  - Template Mgr │    │  - Analytics    │    │  - Users/Auth   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   OpenAI API    │
                       │                 │
                       │  - GPT Models   │
                       │  - Function     │
                       │    Calling      │
                       └─────────────────┘
```

### Kärnkomponenter

#### 1. AI-Assistent (Chat Assistant)
- **Syfte**: Huvudgränssnitt för bokföringsinteraktion
- **Teknik**: OpenAI GPT-4 med Function Calling
- **Princip**: AI identifierar transaktionstyp, väljer mall, visar poster, bekräftar

#### 2. Transaktionsmallar (Single Source of Truth)
- **Syfte**: Definiera all bokföringslogik
- **Lagring**: Databas (`airledger_transaction_templates`)
- **Typer**: Systemmallar (utvecklare) + Användarmallar

#### 3. Edge Functions

**AI & Analys:**
- **chat-assistant**: Huvudfunktion för AI-interaktion
- **analyze-bank-statement**: Analys av bankutdrag
- **analyze-receipt**: Analys av kvitton
- **classify-document**: Klassificering av dokument
- **voice-to-text**: Tal till text (Whisper)

**Core Bokföring:**
- **use-transaction-template**: Skapa transaktioner från mallar
- **save-general-transaction**: Komplexa transaktioner utan mallar
- **save-opening-balance**: Ingående balanser
- **save-transaction**: Spara transaktioner

**Mallhantering:**
- **export-templates**: Exportera mallar
- **import-templates**: Importera mallar
- **validate-templates**: Validera mallar
- **import-bas-accounts**: Importera BAS-konton

**Subscription & Betalning:**
- **check-subscription**: Kontrollera prenumeration
- **create-checkout**: Skapa checkout
- **customer-portal**: Kundportal

**Övrigt:**
- **get-seo-settings**: Hämta SEO-inställningar

#### 4. Databas (PostgreSQL)
- **Transaktioner**: Bokföringsposter och metadata
- **Mallar**: Transaktionsmallar med statistik
- **Användare**: Autentisering och preferenser
- **Säkerhet**: RLS-policies för dataisolation

---

## 🤖 AI-Systemdesign

### System Prompt Design

AI-assistenten styrs av en system prompt som definierar:

- **Persona**: "Air Ledger Assistant" - specialist på svensk bokföring
- **Kunskaper**: BAS-kontoplanen 2024, svensk bokföringspraxis
- **Beslutsstruktur**: Regler för att välja rätt tool baserat på input
- **Kommunikationsstil**: Vänlig, professionell, svenskspråkig

### Kritiska Principer

1. **Mallbaserad kontering**: AI får ALDRIG föreslå specifika kontonummer
2. **Single Source of Truth**: Alla konteringsförslag kommer från mallar
3. **Transparent process**: AI visar alltid mallens poster innan bokföring
4. **Dubblettskydd**: Samma transaktion skapas bara EN gång

### Tillgängliga Funktioner (Function Calling)

#### 1. `use_transaction_template`
- **Syfte**: Huvudfunktion för vanliga transaktioner
- **När**: Hyra, el, telefon, försäkringar, löner, etc.
- **Process**: Identifiera mall → Hämta struktur → Visa poster → Bekräfta → Bokför

#### 2. `save_opening_balance`
- **Syfte**: Ingående balanser
- **När**: "Saldo på konto", "ingående balans"
- **Kräver**: Kontonummer (enda undantaget från mallregeln)

#### 3. `save_general_transaction`
- **Syfte**: Komplexa transaktioner utan befintlig mall
- **När**: Ovanliga eller specifika bokföringsposter
- **Process**: Manuell kontering med validering

### Arbetsflöde

```
Användare skriver meddelande
         ↓
Chat Assistant analyserar
         ↓
AI identifierar transaktionstyp
         ↓
Söker matchande mall i databas
         ↓
Hämtar mallstruktur
         ↓
Visar exakta poster för användaren
         ↓
Användaren bekräftar eller justerar
         ↓
Anropar use_transaction_template
         ↓
Transaktion skapas
         ↓
Statistik uppdateras
```

---

## 📊 Transaktionsmallar

### Vad är Transaktionsmallar?

Fördefinierade bokföringsstrukturer som automatiserar vanliga transaktioner.

### Mallstruktur

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

### Obligatoriska Fält

| Fält | Beskrivning |
|------|-------------|
| `template_name` | Unikt, beskrivande namn |
| `description` | Förklaring av mallens användning |
| `category` | Organisatorisk kategori |
| `template_entries` | Array av bokföringsposter |

### Template Entries

```json
{
  "account_code": "5010",           // BAS-kontonummer
  "account_name": "Lokalhyror",     // Kontonamn från BAS
  "type": "debit",                  // "debit" eller "credit"
  "description": "Hyra januari",   // Beskrivning för posten
  "vat_calculation": "optional"    // Valfritt: VAT-beräkning
}
```

### VAT-beräkningar

| Typ | Beskrivning | Användning |
|-----|-------------|------------|
| `total_amount` | Hela beloppet | Kundfordringar, leverantörsskulder |
| `exclude_vat` | Belopp exklusive moms | Försäljning, inköp |
| `vat_only` | Endast momsbeloppet | Ingående/utgående moms |

### Systemmallar (Exempel)

- Fakturering kund
- Kundbetalning
- Lokalhyra
- Telekommunikation
- Kontorsmaterial
- Programvara
- Konsultarvoden
- Försäkringar
- Preliminärskatt betalning

---

## 🔌 API-dokumentation

För komplett API-dokumentation av alla 18 edge functions, se **[docs/api/edge-functions.md](./docs/api/edge-functions.md)**.

### Huvudfunktioner

#### 1. Chat Assistant

**Endpoint**: `POST /functions/v1/chat-assistant`

**Request**:
```json
{
  "message": "Betalat hyra 8000 kr",
  "conversationId": "uuid-string",
  "imageUrl": "optional-receipt-url"
}
```

**Response**:
```json
{
  "message": "Jag ser att detta passar mallen 'Lokalhyra'...",
  "conversationId": "uuid-string",
  "functionCalls": [
    {
      "function": "use_transaction_template",
      "parameters": {
        "templateName": "Lokalhyra",
        "amount": 8000,
        "description": "Hyra januari 2025"
      },
      "result": {
        "success": true,
        "transactionId": "uuid-string"
      }
    }
  ]
}
```

#### 2. Use Transaction Template

**Endpoint**: `POST /functions/v1/use-transaction-template`

**Request**:
```json
{
  "templateName": "Lokalhyra",
  "amount": 8000,
  "description": "Hyra januari 2025",
  "transactionDate": "2025-01-01",
  "referenceNumber": "REF-001"
}
```

**Response**:
```json
{
  "success": true,
  "transaction": {
    "id": "uuid-string",
    "total_amount": 8000,
    "entries": [
      {
        "account_code": "5010",
        "account_name": "Lokalhyror",
        "debit_amount": 8000,
        "credit_amount": 0
      },
      {
        "account_code": "1930",
        "account_name": "Checkkonto",
        "debit_amount": 0,
        "credit_amount": 8000
      }
    ]
  },
  "template_used": "Lokalhyra",
  "message": "Transaktion skapad från mall 'Lokalhyra'"
}
```

### Övriga Funktioner

Se [docs/api/edge-functions.md](./docs/api/edge-functions.md) för dokumentation av:
- **AI & Analys**: analyze-bank-statement, analyze-receipt, classify-document, voice-to-text
- **Core Bokföring**: save-general-transaction, save-opening-balance, save-transaction
- **Mallhantering**: export-templates, import-templates, validate-templates, import-bas-accounts
- **Subscription**: check-subscription, create-checkout, customer-portal
- **Övrigt**: get-seo-settings

### Autentisering

Alla funktioner kräver JWT-token från Supabase Auth:

```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

const response = await fetch('/functions/v1/function-name', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
```

---

## 🛠️ Utveckling

### Förutsättningar

- Node.js (v18+)
- npm eller yarn
- Git
- Supabase CLI
- VS Code (rekommenderat)

### Snabbstart

```bash
# 1. Klona repository
git clone https://github.com/your-org/airledger.git
cd airledger

# 2. Installera dependencies
npm install

# 3. Supabase setup
npm install -g @supabase/cli
supabase login
supabase start

# 4. Miljövariabler
cp .env.example .env.local
# Lägg till dina nycklar i .env.local

# 5. Starta utvecklingsserver
npm run dev
```

### Databas Migration

```bash
# Kör alla migrations
supabase db reset

# Verifiera att tabeller skapats
supabase db diff
```

### Edge Functions

```bash
# Deploiera funktioner lokalt
supabase functions serve

# Testa funktion
curl -X POST 'http://localhost:54321/functions/v1/chat-assistant' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"message": "test"}'
```

### Kodstandarder

#### TypeScript
- Använd explicita typer
- Undvik `any`
- Använd proper generics

#### React
- Tydlig komponentstruktur
- Custom hooks för återanvändbar logik
- Proper dependency arrays i useEffect

#### Supabase/Backend
- Proper error handling och CORS
- Type-safe queries
- Använd RLS policies

### Testing

```bash
# Kör alla tester
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Deployment

```bash
# Deploiera edge functions
supabase functions deploy

# Bygg frontend
npm run build

# Deploiera (om inte automatiskt via Vercel)
npm run deploy
```

---

## 📝 Resultatrapport

### Översikt

Resultatrapporten genererar en automatisk resultaträkning baserad på BAS-kontoplanen 2024.

### Inkluderade Kontoklasser

#### Intäktskonton (3000-3999)
- **Normal balans**: Kredit
- **Beräkning**: Kredit - Debit = Nettointäkt

#### Kostnadskonton (4000-4999 & 6000-6999)
- **Normal balans**: Debit
- **Beräkning**: Debit - Kredit = Nettokostnad

### Exkluderade Kontoklasser

- **1000-2999**: Balansräkningskonton
- **5000-5999**: Finansiella poster
- **7000-8999**: Koncernposter

### Rapportperioder

- Innevarande månad
- Föregående månad
- Innevarande år
- Föregående år

---

## 🔒 Säkerhet

### Row Level Security (RLS)
- Alla tabeller har RLS aktiverat
- Användare kan endast se sina egna data
- Systemmallar är tillgängliga för alla autentiserade användare

### Autentisering
- Supabase Auth hanterar all användarautentisering
- JWT-tokens för API-åtkomst
- Säker session-hantering

### API-säkerhet
- Edge functions validerar användartoken
- Ingen direktåtkomst till känslig data
- Proper error handling utan läckage

---

## 📊 Spårbarhet

### Ändringslogg

Se `docs/traceability/changelog.md` för detaljerad versionshistorik.

### Beslutsdagbok

Se `docs/traceability/decision-log.md` för arkitektoniska beslut och motiveringar.

---

## 🎯 Arkitektoniska Beslut

### ADR-001: Mallbaserat Bokföringssystem

**Beslut**: Implementera "Single Source of Truth"-principen där alla konteringsförslag kommer från transaktionsmallar i databasen.

**Konsekvenser**:
- ✅ Konsistent bokföring över tid
- ✅ Enkelt att lägga till nya transaktionstyper
- ✅ Testbar och verifierbar logik
- ✅ Användarna kan anpassa mallar

**Implementering**:
- Borttaget `save-invoice` och `save-payment` edge functions
- Uppdaterat system prompt att inte innehålla specifika kontonummer
- Skapat `use_transaction_template` som huvudfunktion

### ADR-002: OpenAI Function Calling

**Beslut**: Använd OpenAI:s Function Calling API för all AI-backend-interaktion.

**Konsekvenser**:
- ✅ Strukturerade och förutsägbara AI-svar
- ✅ Automatisk parameter-validering
- ✅ Type-safe function calls

### ADR-003: Supabase Edge Functions

**Beslut**: Använd Supabase Edge Functions för all backend-logik.

**Konsekvenser**:
- ✅ Automatisk skalning
- ✅ Inbyggd PostgreSQL-integration
- ✅ Säker environment för secrets

---

## 🚀 Framtida Utveckling

### Planerade Features

- Template versioning (Q2 2025)
- Multi-language support (Q3 2025)
- Advanced analytics (Q2 2025)
- Integration APIs (Q3 2025)

### Överväganden

- Automatisk mallgenerering
- Mallvalidering
- Branschspecifika mallpaket

---

## 📚 Ytterligare Dokumentation

### Detaljerade Guider

- **Mallskapande**: `docs/templates/creation-guide.md`
- **Kodstandarder**: `docs/development/code-standards.md`
- **Komma igång**: `docs/development/getting-started.md`
- **API-detaljer**: `docs/api/edge-functions.md`

### Arkitektur

- **Systemöversikt**: `docs/architecture/system-overview.md`
- **AI-system**: `docs/architecture/ai-system-design.md`

### Spårbarhet

- **Ändringslogg**: `docs/traceability/changelog.md`
- **Beslutsdagbok**: `docs/traceability/decision-log.md`

---

## 🤝 Bidra till Projektet

### Lägg till Nya Mallar

1. Identifiera vanliga transaktioner
2. Definiera korrekta BAS-konton
3. Skapa mall i systemet
4. Uppdatera AI system prompt (om nödvändigt)
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

---

## 📞 Support

### Interna Resurser
- **Dokumentation**: `/docs` mappen
- **Team Wiki**: Intern dokumentation

### Externa Resurser
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **OpenAI API**: https://platform.openai.com/docs

### Få Hjälp
- **GitHub Issues**: För buggar och feature requests
- **Code Review**: PR-process för alla ändringar

---

## 📄 Licens

Detta projekt är utvecklat som en del av Lovable-plattformen.

---

**Senast uppdaterad**: 2025-01-17 | **Version**: 1.2.0
