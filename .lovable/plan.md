

# Delad kontextplattform -- `_shared/` arkitektur

## Problemet idag

Logiken ar duplicerad mellan `chat-assistant` och `analyze-bank-statement`. Bankutdragsanalysen har en enklare, inline version av template-matchning och saknar helt kontext om anvandarens bokforing. Varje ny "kantboll" (skatt, lon, amortering) kraver ad hoc-fixar i tva separata filer.

## Princip

**En transaktion ar en transaktion** -- oavsett om den kommer fran chatten, ett bankutdrag, en CSV-import eller framtida SIE-import. Alla ska ga genom samma pipeline:

```text
Input --> Kontext --> Klassificering --> Mallmatchning --> Forslag --> Bekraftelse --> Bokforing
```

Bankutdrag ar bara ett batchlager dar Gemini extraherar radata fran en bild, sedan matas varje rad genom den ordinarie pipelinen.

## Vad som flyttas till `_shared/`

| Modul | Ansvar | Anvands av |
|-------|--------|------------|
| `types.ts` | Gemensamma typer (UserData, TemplateMatch, etc.) | Alla |
| `data-fetcher.ts` | Hamta anvandardata + berakna kontosaldon | chat-assistant, analyze-bank-statement |
| `context-builder.ts` | buildLightContext, buildBookkeepingContext, **ny: buildFinancialSnapshot** | chat-assistant, analyze-bank-statement |
| `template-matcher.ts` | matchTemplate + **ny: matchSingleTransaction** (for bankutdrag) | chat-assistant, analyze-bank-statement |
| `quota.ts` | checkAndUpdateQuota (idag duplicerad) | chat-assistant, analyze-bank-statement |

## Ny funktion: `buildFinancialSnapshot`

Beraknar aktuellt saldo per konto (IB + debet - kredit) for konton med aktivitet. Returnerar en komprimerad strang som injiceras i AI-prompter:

```text
KONTOSALDON:
1640 Skattefordringar: 10 417 kr (debet)
2510 Skatteskulder: 5 069 kr (kredit)
1930 Bankkonto: 45 230 kr (debet)
2641 Ingaende moms: 3 200 kr (debet)
```

Detta ger AI:n (bade i chat och bankutdrag) kontexten att forsta att "sk5566161658 +6 297 kr" troligen ar en aterbetalning mot den kanda skattefordran pa 1640.

## Ny funktion: `matchSingleTransaction`

En forenklad wrapper runt den befintliga `matchTemplate`-logiken, anpassad for bankutdragsrader:

- Tar en enstaka transaktion (description, amount, type)
- Matchar mot mallbiblioteket
- Applicerar kontokoder och momsregler fran mallen
- Returnerar matchad mall + entries

Ersatter den inline-logiken som idag finns i `analyze-bank-statement`.

## Filmatris

| Fil | Andring |
|-----|---------|
| `supabase/functions/_shared/types.ts` | Ny: flytta typer fran chat-assistant/types.ts, utoka UserData med accountBalances |
| `supabase/functions/_shared/data-fetcher.ts` | Ny: flytta fetchUserData, lagg till saldoberakning |
| `supabase/functions/_shared/context-builder.ts` | Ny: flytta buildLightContext + buildBookkeepingContext, lagg till buildFinancialSnapshot |
| `supabase/functions/_shared/template-matcher.ts` | Ny: flytta matchTemplate + warning-logik, lagg till matchSingleTransaction |
| `supabase/functions/_shared/quota.ts` | Ny: flytta duplicerad checkAndUpdateQuota |
| `supabase/functions/chat-assistant/types.ts` | Re-export fran _shared |
| `supabase/functions/chat-assistant/data-fetcher.ts` | Re-export fran _shared |
| `supabase/functions/chat-assistant/context-builder.ts` | Re-export fran _shared |
| `supabase/functions/chat-assistant/template-matcher.ts` | Re-export fran _shared |
| `supabase/functions/chat-assistant/index.ts` | Importera quota fran _shared, resten via re-exports |
| `supabase/functions/analyze-bank-statement/index.ts` | Ta bort inline-logik, importera fran _shared, injicera financialSnapshot i prompt |
| Databasmigration | 3 nya skattemallar (aterbetalning, inbetalning prelskatt, slutlig skatt) |

## Hur bankutdraget andras

Nuvarande flode:

```text
Bild --> Gemini (gissar kontokoder) --> Inline matchning (enkel keyword) --> Resultat
```

Nytt flode:

```text
Bild --> fetchUserData --> buildFinancialSnapshot
     --> Gemini (med snapshot i prompt, gissar battre) --> matchSingleTransaction per rad --> Resultat
```

Gemini far kontexten **innan** den tolkar bilden, sa den kan koppla "sk5566161658" till skattefordran pa 1640 redan i sin gissning. Sedan validerar template-matchern resultatet mot mallbiblioteket.

## Skattemallar (databasmigration)

Tre nya systemmallar:
- **Skatteaterbetalning fran Skatteverket**: Debet 1930 / Kredit 1640, keywords: `['skatteverket', 'aterbetalning', 'sk55', 'preliminarskatt']`, momsfri
- **Inbetalning preliminarskatt (F-skatt)**: Debet 1640 / Kredit 1930, keywords: `['preliminarskatt', 'f-skatt', 'debiterad skatt']`, momsfri
- **Slutlig skatt**: Debet 2510 / Kredit 1930, keywords: `['slutlig skatt', 'kvarskatt', 'restskatt']`, momsfri

## Vad detta ger oss

- **Ingen duplicering**: En andring i template-matchning eller kontext syns overallt
- **Generellt**: Framtida importformat (CSV, SIE) importerar fran samma `_shared/`
- **Kontextmedvetet**: AI:n ser alltid anvandarens bokforingsstatus, oavsett kanal
- **Utbyggbart**: Nya monsterregler (lon, amortering) laggs till i _shared utan att rora enskilda funktioner

