
# AirLedger AI - Utvecklingsdokumentation

## Översikt
Denna dokumentation beskriver arkitektur, design och utvecklingsprocesser för AirLedger AI - ett mallbaserat bokföringssystem med AI-assistent.

## Dokumentationsstruktur

### 📋 Arkitektur
- [Systemöversikt](architecture/system-overview.md) - Hög-nivå arkitektur och komponenter
- [AI-systemdesign](architecture/ai-system-design.md) - Hur AI-assistenten fungerar

### 🔌 API-referens
- [Edge Functions API](api/edge-functions.md) - Komplett API-dokumentation

### 🛠️ Utveckling
- [Komma igång](development/getting-started.md) - Setup för nya utvecklare
- [Kodstandarder](development/code-standards.md) - Best practices och conventions

### 📝 Mallsystem
- [Mallskapande](templates/creation-guide.md) - Hur man skapar transaktionsmallar

### 📊 Spårbarhet
- [Beslutsdagbok](traceability/decision-log.md) - Arkitektoniska beslut
- [Ändringslogg](traceability/changelog.md) - Strukturerad versionshistorik

## Snabbstart för Utvecklare

1. Läs **[MASTER.md](../MASTER.md)** för komplett dokumentation
2. Sätt upp utvecklingsmiljö enligt [Komma igång](development/getting-started.md)
3. Bekanta dig med [Systemöversikt](architecture/system-overview.md)
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
