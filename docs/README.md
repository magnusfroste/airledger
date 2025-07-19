
# AirLedger AI - Utvecklingsdokumentation

## Översikt
Denna dokumentation beskriver arkitektur, design och utvecklingsprocesser för AirLedger AI - ett mallbaserat bokföringssystem med AI-assistent.

## Dokumentationsstruktur

### 📋 Arkitektur
- [Systemöversikt](architecture/system-overview.md) - Hög-nivå arkitektur och komponenter
- [Databasschema](architecture/database-schema.md) - Tabeller, relationer och RLS-policies
- [AI-systemdesign](architecture/ai-system-design.md) - Hur AI-assistenten fungerar
- [Mallsystemet](architecture/template-system.md) - Mallbaserad arkitektur
- [Edge Functions Flöde](architecture/edge-functions-flow.md) - Dataflöde genom backend

### 🔌 API-referens
- [Edge Functions API](api/edge-functions.md) - Komplett API-dokumentation
- [Funktionsdefinitioner](api/function-definitions.md) - AI-funktioner i detalj
- [Felhantering](api/error-handling.md) - Felkoder och hantering
- [Autentisering](api/authentication.md) - Säkerhet och access control

### 🛠️ Utveckling
- [Komma igång](development/getting-started.md) - Setup för nya utvecklare
- [Kodstandarder](development/code-standards.md) - Best practices och conventions
- [Testning](development/testing.md) - Teststrategier och verktyg
- [Deployment](development/deployment.md) - Deploy-process och miljöer

### 📝 Mallsystem
- [Mallskapande](templates/creation-guide.md) - Hur man skapar transaktionsmallar
- [Systemmallar](templates/system-templates.md) - Fördefinierade standardmallar
- [Validering](templates/validation.md) - Valideringsregler och exempel
- [AI-integration](templates/ai-integration.md) - Hur AI använder mallarna

### 📊 Spårbarhet
- [Beslutsdagbok](traceability/decision-log.md) - Arkitektoniska beslut
- [Ändringslogg](traceability/changelog.md) - Strukturerad versionshistorik
- [Säkerhetsdokumentation](traceability/security.md) - Säkerhetsimplementering
- [Prestandariktlinjer](traceability/performance.md) - Optimering och best practices

## Snabbstart för Utvecklare

1. Läs [Systemöversikt](architecture/system-overview.md)
2. Sätt upp utvecklingsmiljö enligt [Komma igång](development/getting-started.md)
3. Bekanta dig med [Mallsystemet](architecture/template-system.md)
4. Granska [AI-systemdesign](architecture/ai-system-design.md)

## Viktiga Principer

### Single Source of Truth
Alla konteringsförslag MÅSTE komma från transaktionsmallar - inga hårdkodade kontonummer i kod eller prompts.

### Mallbaserad Arkitektur
Systemet bygger på fördefinierade mallar som styr all bokföringslogik, vilket ger konsistens och underhållbarhet.

### Säkerhet Först
Row Level Security (RLS) och proper autentisering används genomgående för att skydda användardata.

## Bidra till Dokumentationen

Se [Kodstandarder](development/code-standards.md) för riktlinjer om hur du bidrar till denna dokumentation.
