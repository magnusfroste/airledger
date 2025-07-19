
# Systemöversikt - AirLedger AI

## Arkitektur på Hög Nivå

AirLedger AI är byggt som en modern, skalbar applikation med följande huvudkomponenter:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Supabase Edge  │    │   PostgreSQL    │
│                 │    │   Functions     │    │   Database      │
│  - Chat UI      │◄──►│                 │◄──►│                 │
│  - Dashboard    │    │  - AI Assistant │    │  - Transactions │
│  - Reports      │    │  - Templates    │    │  - Templates    │
│                 │    │  - Analytics    │    │  - Users/Auth   │
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

## Kärnkomponenter

### 1. Frontend (React + TypeScript)
- **Chat Interface**: Huvudgränssnittet för AI-interaktion
- **Dashboard**: Översikt av transaktioner och rapporter
- **Template Manager**: Hantering av transaktionsmallar
- **Reports**: Ekonomiska rapporter och analyser

### 2. Backend (Supabase Edge Functions)
- **Chat Assistant**: Huvudfunktion för AI-interaktion
- **Template Engine**: Hantering av transaktionsmallar
- **Transaction Processing**: Bokföringslogik
- **Data Analytics**: Rapportgenerering

### 3. Databas (PostgreSQL)
- **Transaktioner**: Bokföringsposter och metadata
- **Mallar**: Transaktionsmallar och användningsstatistik
- **Användare**: Autentisering och preferenser
- **Meddelanden**: Chatthistorik

### 4. Externa Tjänster
- **OpenAI API**: AI-funktionalitet och naturlig språkbearbetning
- **Supabase Auth**: Användarautentisering
- **Supabase Storage**: Filhantering (kvitton, bilder)

## Dataflöde

### Typisk Användarinteraktion
1. **Användaren** skriver meddelande i chatten
2. **Frontend** skickar meddelande till chat-assistant edge function
3. **Edge function** analyserar meddelandet och anropar OpenAI
4. **OpenAI** returnerar strukturerat svar med function calls
5. **Edge function** exekverar funktioner (t.ex. use_transaction_template)
6. **Databas** uppdateras med nya transaktioner
7. **Svar** skickas tillbaka till frontend
8. **UI** uppdateras med resultat

### Mallbaserat Arbetsflöde
1. **AI identifierar** transaktionstyp från användarinput
2. **Systemet söker** efter matchande mall i databasen
3. **Mall hämtas** med all bokföringslogik
4. **AI presenterar** mallens exakta poster för användaren
5. **Användaren bekräftar** eller justerar
6. **Transaktion skapas** baserat på mallen
7. **Statistik uppdateras** för mallanvändning

## Säkerhetsarkitektur

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
- Proper error handling utan läckage av information

## Skalbarhet och Prestanda

### Horisontell Skalning
- Edge functions skalar automatiskt med Supabase
- Databas-connections poolade och optimerade
- Frontend servas från CDN

### Caching-strategier
- Template-caching för snabbare mallåtkomst
- Query-optimering med index
- Client-side caching av användarpreferenser

### Övervakning
- Edge function logs för debugging
- Databasprestandaövervakning
- Användningsstatistik och analytics

## Utvecklingsmiljö

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase Edge Functions (Deno)
- **Databas**: PostgreSQL med Supabase
- **AI**: OpenAI GPT-4 med Function Calling
- **Auth**: Supabase Authentication
- **Storage**: Supabase Storage

### Verktyg
- **Development**: Vite dev server, Supabase CLI
- **Testing**: Vitest, React Testing Library
- **Deployment**: Vercel (frontend), Supabase (backend)
- **Monitoring**: Supabase Dashboard, Edge Function logs

Denna arkitektur ger en solid grund för skalbar, säker och underhållbar utveckling av AirLedger AI.
