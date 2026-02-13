
# Ta bort hårdkodade konton och lägga till kontovalidering

## Bakgrund
Idag filtrerar `context-builder.ts` kontoplanen till bara 11 hårdkodade konton. Det begränsar AI:ns förmåga att bokföra korrekt utanför mallarna. Vi har redan 812 BAS 2024-konton i databasen som täcker 98% av BAS 2026.

## Ändringar

### 1. context-builder.ts — Ta bort hårdkodade konton
Ersätt det hårdkodade filtret (rad 47-53) med en smart gruppering som skickar kontoplanen organiserad per kontoklass (1xxx-8xxx). Detta ger AI:n tillgång till hela kontoplanen utan att spränga token-budgeten.

Strategi: Skicka kontoklasser som rubriker med underliggande konton, t.ex.:
```
KONTOKLASS 1 - Tillgångar:
1010 Balanserade utgifter
1930 Checkkonto
...
```

### 2. save-general-transaction — Kontovalidering
Lägg till en databasvalidering som kontrollerar att varje `accountCode` i inkommande entries faktiskt existerar i `airledger_chart_of_accounts` innan transaktionen sparas. Om ett konto inte finns returneras ett tydligt felmeddelande.

### 3. function-definitions.ts — Uppdatera beskrivning
Ändra "BAS 2024" till "BAS-kontoplanen" i function definitions så att det inte refererar till ett specifikt år.

## Tekniska detaljer

### context-builder.ts
- Ta bort `filter`-logiken på rad 49-51
- Gruppera konton per kontoklass (första siffran) för läsbarhet
- Begränsa till ~200 vanligaste konton baserat på `account_type` för att hålla token-användningen rimlig

### save-general-transaction/index.ts
- Efter entry-validering (rad 35-57), lägg till en lookup mot `airledger_chart_of_accounts`
- Hämta alla unika `accountCode` från entries i en enda query
- Jämför mot resultatet — om något konto saknas, returnera fel med kontonummer och förslag

### function-definitions.ts
- Rad 81, 98: Ändra "BAS 2024" till "BAS-kontoplanen"
