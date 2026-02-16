

# Årsbokslut med Air -- Förbättringsplan

## Nuläge

Air har idag en grundläggande bokslutscheck (`get_year_end_checklist`) som visar en statisk checklista med:
- Antal transaktioner bokförda
- Om avskrivningar finns (konto 7800-7899)
- Om periodiseringar finns (1700-1799, 2900-2999)
- Om skatteavsättning finns (8910)
- Tre manuella steg: "Resultaträkning granskad", "Balansräkning granskad", "Räkenskapsåret låst"

Mallar finns för avskrivningar och periodiseringar, men saknas for flera bokslutsposter. Flödet är inte interaktivt -- Air presenterar listan men guidar inte användaren vidare.

## Mål

Göra Air till en steg-för-steg bokslutsguide som proaktivt leder användaren genom hela processen.

---

## Plan

### 1. Nya bokslutsmallar

Skapa mallar i databasen för vanliga bokslutsposter som saknas:

- **Skatteavsättning bolagsskatt** -- Debet 8910 Skatt på årets resultat / Kredit 2510 Skatteskulder (nyckelord: skatteavsättning, bolagsskatt, inkomstskatt, bokslut skatt)
- **Avsättning till periodiseringsfond** -- Debet 8811 Avsättning periodiseringsfond / Kredit 2110 Periodiseringsfond (nyckelord: periodiseringsfond, avsättning)
- **Upplupna kostnader (bokslut)** -- Debet kostnadskonto / Kredit 2990 Övriga upplupna kostnader (generisk periodisering)
- **Förutbetalda intäkter** -- Debet 3001 Försäljning / Kredit 2990 Övriga upplupna kostnader

### 2. Förbättrad checklista med beräknade värden

Uppgradera `get_year_end_checklist` i function-handlers.ts:

- Beräkna **årets resultat** (intäkter klass 3 minus kostnader klass 4-7) och visa det
- Beräkna **uppskattad skatt** (20.6% av resultat om positivt) som hjälp
- Visa **antal ej avstämda konton** (konton med "orimliga" saldon)
- Visa totalsummor per kontoklass för snabb överblick
- Returnera strukturerad data, inte bara text, så AI kan agera på den

### 3. Steg-för-steg guidning i systemprompt

Uppdatera system-prompten med tydligare årsbokslutslogik:

```text
ÅRSBOKSLUT GUIDE:
1. Visa checklista med get_year_end_checklist
2. Gå igenom ETT steg i taget -- fråga aldrig om allt på en gång
3. För varje steg:
   a) Förklara kort vad steget innebär
   b) Visa aktuella saldon som är relevanta
   c) Föreslå bokföring med mall om sådan finns
   d) Bekräfta att steget är klart innan nästa
4. Ordning: Transaktioner -> Avskrivningar -> Periodiseringar -> 
   Skatteavsättning -> Granska resultat -> Granska balans
```

### 4. Bokslutssammanfattning (ny funktion)

Ny funktion `generate_year_end_summary` som:

- Hämtar resultaträkning (intäkter - kostnader per kontoklass)
- Hämtar balansräkning (tillgångar vs skulder + eget kapital)
- Kontrollerar att balansen går jämnt ut
- Visar som formaterad rapport i chatten
- Flaggar eventuella varningar (t.ex. balans stämmer inte, saknade avskrivningar)

### 5. Koppling till befintliga rapporter

Lägga till snabblänkar i Air:s svar som pekar till `/reports` och `/balance-sheet` så användaren kan granska i gränssnittet.

---

## Tekniska detaljer

### Filer som ändras

| Fil | Ändring |
|-----|---------|
| `supabase/functions/chat-assistant/function-definitions.ts` | Lägg till `generate_year_end_summary` |
| `supabase/functions/chat-assistant/function-handlers.ts` | Förbättra `get_year_end_checklist` + ny handler för summary |
| `supabase/functions/chat-assistant/system-prompt.ts` | Utökad bokslutsguide-sektion |
| Databas (migration) | Nya bokslutsmallar |

### Stegordning

1. Skapa bokslutsmallar via databasinsättning
2. Uppgradera `get_year_end_checklist` med resultatberäkning och bättre struktur
3. Lägg till `generate_year_end_summary` funktion
4. Uppdatera systemprompt med bokslutsguide-instruktioner
5. Uppdatera function-definitions med ny funktion

