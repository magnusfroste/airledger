
# Komma igång - AirLedger AI Utveckling

## Förutsättningar

### Obligatoriska Verktyg
- **Node.js** (v18+)
- **npm** eller **yarn**
- **Git**
- **Supabase CLI**
- **VS Code** (rekommenderat)

### Nödvändiga Konton
- **GitHub** - För kodrepository
- **Supabase** - För backend och databas
- **OpenAI** - För AI-funktionalitet
- **Vercel** - För frontend-deployment (valfritt)

## Snabbstart (5 minuter)

### 1. Klona Repository
```bash
git clone https://github.com/your-org/airledger-ai.git
cd airledger-ai
```

### 2. Installera Dependencies
```bash
npm install
```

### 3. Supabase Setup
```bash
# Installera Supabase CLI
npm install -g @supabase/cli

# Logga in
supabase login

# Starta lokal utvecklingsmiljö
supabase start
```

### 4. Miljövariabler
```bash
# Kopiera exempel-config
cp .env.example .env.local

# Lägg till dina nycklar
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5. Starta Utvecklingsserver
```bash
npm run dev
```

🎉 **Du är igång!** Applikationen körs på `http://localhost:5173`

## Detaljerad Setup

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

### Systemmallar
```bash
# Ladda standardmallar
npm run load-templates

# Validera mallar
npm run validate-templates
```

## Utvecklingsmiljö

### Mapstruktur
```
airledger-ai/
├── src/                    # Frontend React-kod
│   ├── components/         # UI-komponenter
│   ├── pages/             # Sidor/Routes
│   ├── hooks/             # Custom hooks
│   ├── integrations/      # Supabase integration
│   └── lib/               # Hjälpfunktioner
├── supabase/              # Backend-kod
│   ├── functions/         # Edge functions
│   ├── migrations/        # Databas-migrations
│   └── config.toml        # Supabase-konfiguration
├── docs/                  # Utvecklingsdokumentation
└── public/                # Statiska filer
```

### Viktiga Filer
- `src/App.tsx` - Huvudkomponent
- `src/integrations/supabase/client.ts` - Supabase-klient
- `supabase/functions/chat-assistant/index.ts` - AI-huvudfunktion
- `docs/architecture/system-overview.md` - Systemarkitektur

## Utvecklingsflöde

### 1. Feature Development
```bash
# Skapa feature branch
git checkout -b feature/din-feature

# Utveckla lokalt
npm run dev

# Testa edge functions
supabase functions serve --debug
```

### 2. Testing
```bash
# Kör alla tester
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### 3. Code Quality
```bash
# Linting
npm run lint

# Formattering
npm run format

# Type checking
npm run type-check
```

### 4. Deployment
```bash
# Deploiera edge functions
supabase functions deploy

# Bygg frontend
npm run build

# Deploiera (om inte automatiskt via Vercel)
npm run deploy
```

## Debugging

### Frontend Debugging
```typescript
// React Developer Tools
// Installera browser extension

// Console logging
console.log('Debug info:', data)

// Error boundaries
// Automatiskt inkluderat i komponenter
```

### Backend Debugging
```bash
# Edge function logs
supabase functions logs chat-assistant --follow

# Lokal debugging
supabase functions serve --debug --env-file .env.local
```

### Databas Debugging
```bash
# Anslut till lokal databas
supabase db connect

# SQL frågor
SELECT * FROM airledger_transactions LIMIT 5;

# Performance analys
EXPLAIN ANALYZE SELECT * FROM airledger_transactions;
```

## Vanliga Problem och Lösningar

### Problem: "Function not found"
```bash
# Kontrollera att funktioner är deployade
supabase functions list

# Deploiera om
supabase functions deploy chat-assistant
```

### Problem: "Template not found"
```bash
# Kontrollera systemmallar
npm run list-templates

# Ladda om mallar
npm run load-templates
```

### Problem: "Database connection error"
```bash
# Kontrollera Supabase status
supabase status

# Starta om
supabase stop
supabase start
```

## Utvecklingsverktyg

### VS Code Extensions
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

### Användbara Scripts
```bash
# Fullständig reset av utvecklingsmiljö
npm run dev:reset

# Generera TypeScript-typer från Supabase
npm run types:generate

# Analysera bundle-storlek
npm run analyze

# Säkerhetsaudit
npm audit
```

## Nästa Steg

1. **Läs arkitekturdokumentation**: [System Overview](../architecture/system-overview.md)
2. **Utforska mallsystemet**: [Template Creation Guide](../templates/creation-guide.md)
3. **Förstå AI-systemet**: [AI System Design](../architecture/ai-system-design.md)
4. **Granska kodstandarder**: [Code Standards](code-standards.md)

## Support

### Interna Resurser
- **Dokumentation**: `/docs` mappen
- **Code Examples**: `/examples` mappen
- **Team Wiki**: Intern dokumentation

### Externa Resurser
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **OpenAI API**: https://platform.openai.com/docs

### Få Hjälp
- **Slack**: #airledger-dev kanal
- **GitHub Issues**: För buggar och feature requests
- **Code Review**: PR-process för alla ändringar

Nu är du redo att börja utveckla på AirLedger AI! 🚀
