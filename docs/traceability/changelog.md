
# Ändringslogg - AirLedger AI

Alla betydande ändringar i AirLedger AI-projektet dokumenteras här.

Formatet baseras på [Keep a Changelog](https://keepachangelog.com/sv-SE/1.0.0/) och följer [Semantic Versioning](https://semver.org/lang/sv/).

## [Ej Släppt]

### Tillagt
- Komplett utvecklingsdokumentation med strukturerad docs-mapp
- Beslutsdagbok för arkitektoniska beslut
- Detaljerad API-dokumentation för alla edge functions
- Kodstandarder och best practices guide

## [1.2.0] - 2025-01-17

### Tillagt
- Mallbaserat bokföringssystem enligt "Single Source of Truth"-principen
- `use_transaction_template` edge function för mallbaserade transaktioner
- Template validation system med AI-analys
- Template usage statistics och tracking
- Comprehensive designspecifikation i `DESIGN_SPECIFICATION.md`

### Ändrat
- **BREAKING**: System prompt innehåller inte längre specifika kontonummer
- **BREAKING**: Function definitions uppdaterade för mallbaserat flöde
- AI-assistent prioriterar nu mallanvändning över manuell kontering
- Förbättrat AI-arbetsflöde med transparent mallvisning

### Borttaget
- **BREAKING**: `save-invoice` edge function (ersatt av mallar)
- **BREAKING**: `save-payment` edge function (ersatt av mallar)
- Hårdkodade kontonummer från AI-prompts och funktioner

### Säkerhet
- Mallarnas RLS-policies säkerställer proper isolation
- Validering av alla malloperationer

## [1.1.2] - 2025-01-15

### Fixat
- Dublettransaktioner genom förbättrat function call-skydd
- AI response parsing errors vid komplexa meddelanden
- Template selection accuracy vid svenska nyckelord

### Ändrat
- Förbättrat felmeddelanden i edge functions
- Optimerad databas-query performance för mallar

## [1.1.1] - 2025-01-12

### Fixat
- CORS-problem i chat-assistant edge function
- Autentiseringsfel vid parallella requests
- Memory leaks i OpenAI API-anrop

### Säkerhet
- Förbättrat rate limiting för edge functions
- Enhanced input validation

## [1.1.0] - 2025-01-10

### Tillagt
- Chat-interface med meddelande-historik
- Receipt image analysis med OpenAI Vision
- Dashboard med transaktionsöversikt
- Basic rapport-funktionalitet
- Template Manager UI för malmhantering

### Ändrat
- Förbättrat UI/UX med Tailwind design system
- Optimerad mobile responsiveness
- Enhanced error handling i frontend

### Fixat
- Transaction date parsing issues
- Swedish language handling i AI-responses

## [1.0.1] - 2025-01-05

### Fixat
- Initial deployment issues
- Database migration errors
- Edge function authentication problems

### Säkerhet
- Proper JWT token validation
- Enhanced RLS policies

## [1.0.0] - 2025-01-01

### Tillagt
- Initial release av AirLedger AI
- Core booking functionality med AI-assistent
- Supabase backend med PostgreSQL
- React frontend med TypeScript
- Basic transactional system
- User authentication och authorization
- Swedish BAS chart of accounts integration

### Säkerhet
- Row Level Security (RLS) för alla tabeller
- Proper user data isolation
- Secure API endpoints

---

## Ändringstyper

- **Tillagt** för nya funktioner
- **Ändrat** för ändringar i befintlig funktionalitet
- **Deprecated** för funktioner som snart tas bort
- **Borttaget** för borttagna funktioner
- **Fixat** för buggfixar
- **Säkerhet** för säkerhetsrelaterade ändringar

## Migration Guide

### Från v1.1.x till v1.2.0

#### Breaking Changes

1. **Borttagna Edge Functions**
   ```bash
   # Dessa funktioner finns inte längre:
   # - save-invoice
   # - save-payment
   
   # Ersätt med:
   supabase.functions.invoke('use-transaction-template', {
     body: {
       templateName: 'Fakturering kund', // eller 'Kundbetalning'
       amount: 1250,
       description: 'Beskrivning'
     }
   })
   ```

2. **System Prompt Changes**
   - AI:n kommer inte längre föreslå specifika kontonummer
   - Alla förslag kommer från mallar i databasen
   - Förvänta dig annat beteende i AI-svar

3. **Template System**
   ```sql
   -- Kontrollera att systemmallar finns
   SELECT * FROM airledger_transaction_templates 
   WHERE is_system_template = true;
   
   -- Ladda standardmallar om nödvändigt
   -- (Se deployment docs)
   ```

#### Recommended Actions

1. **Uppdatera din kod** som anropar borttagna funktioner
2. **Testa AI-beteende** med dina vanligaste transaktioner
3. **Granska mallar** för att säkerställa att de matchar dina behov
4. **Validera systemmallar** med validate-templates funktionen

### Från v1.0.x till v1.1.0

#### Database Changes
```sql
-- Nya tabeller skapade automatiskt via migrations
-- Kontrollera att alla migreringar körts:
SELECT * FROM supabase_migrations.schema_migrations;
```

#### Frontend Changes
- Nya komponenter kan kräva stylesheet-uppdateringar
- Kontrollera att alla nya dependencies installerats: `npm install`

---

## Support för Äldre Versioner

| Version | Support Status | End of Life |
|---------|---------------|-------------|
| 1.2.x   | ✅ Aktiv      | TBD         |
| 1.1.x   | ⚠️ Säkerhet   | 2025-03-01  |
| 1.0.x   | ❌ Upphört    | 2025-02-01  |

## Rapportera Problem

Om du hittar problem efter en uppgradering:

1. **Kontrollera Migration Status**
   ```bash
   supabase db diff
   supabase status
   ```

2. **Granska Edge Function Logs**
   ```bash
   supabase functions logs chat-assistant
   ```

3. **Skapa GitHub Issue**
   - Inkludera version information
   - Beskriv steg för att återskapa problemet
   - Bifoga relevanta loggar

4. **Kontakta Support**
   - Slack: #airledger-support
   - Email: support@airledger.se
