

# Robust konversationsstyrd datainsamling

## Problem

Idag hanterar systemet bara **ett belopp** per mall. Mallar som "Försäljning fond med förlust" kräver dock **flera datapunkter** (försäljningspris + anskaffningsvärde) for att kunna beräkna alla poster korrekt. Resultatet blir att Air antingen frågar "Vilket belopp?" utan kontext, eller sätter alla poster till samma belopp.

## Lösning: Template-Driven Data Collection

Varje mall definierar vilka fält den behöver. Air inspekterar mallen, jämför med vad användaren redan angett, och frågar bara om det som saknas -- steg for steg.

```text
+------------------+     +-------------------+     +------------------+
| 1. Intent        | --> | 2. Mall matchad   | --> | 3. Fält-analys   |
| Klassificering   |     | (template-matcher)|     | (required_fields)|
+------------------+     +-------------------+     +------------------+
                                                          |
                                              +-----------+-----------+
                                              |                       |
                                        Allt finns             Fält saknas
                                              |                       |
                                    +-------------------+   +-------------------+
                                    | 4a. Förslag       |   | 4b. Fråga om      |
                                    | med alla belopp   |   | nästa saknade fält|
                                    +-------------------+   +-------------------+
                                                                      |
                                                              Användaren svarar
                                                                      |
                                                              +-------v-------+
                                                              | Tillbaka till  |
                                                              | steg 3        |
                                                              +--------------+
```

## Tekniska ändringar

### 1. Utöka mallschemat med `required_fields`

Ny kolumn `required_fields` (jsonb) i `airledger_transaction_templates`. Fält som mallen behöver utöver standardfälten (belopp, datum, beskrivning).

Exempel för "Försäljning fond med förlust":

```json
[
  {
    "key": "selling_price",
    "label": "Försäljningspris",
    "prompt": "Vilket belopp fick du vid försäljningen?",
    "type": "amount",
    "maps_to_entry": 0
  },
  {
    "key": "acquisition_value",
    "label": "Anskaffningsvärde",
    "prompt": "Vad var anskaffningsvärdet (det du betalade för fondandelarna)?",
    "type": "amount",
    "maps_to_entry": 2
  }
]
```

`maps_to_entry` pekar på index i `template_entries`-arrayen. Post 1 (8370, förlusten) beräknas automatiskt: `acquisition_value - selling_price`.

### 2. Ny hjälpfunktion: `analyzeRequiredFields`

I `chat-assistant/index.ts`. Tar mall + extracted_data + conversationHistory och returnerar:
- `{ complete: true, fieldValues: {...} }` om all data finns
- `{ complete: false, nextQuestion: "..." }` om fält saknas

Logik:
1. Om mallen har `required_fields` -- iterera och matcha mot `extracted_data` + historik
2. Om mallen INTE har `required_fields` -- fallback till dagens beteende (kräv bara `amount`)
3. Sök i konversationshistoriken efter tidigare svar på fältfrågor (mönster: `❓ ... Försäljningspris` + användarens svar)

### 3. Ny hjälpfunktion: `calculateTemplateAmounts`

Tar mallens `template_entries`, `required_fields` och insamlade `fieldValues`. Beräknar varje posts belopp:
- Poster med `maps_to_entry` --> direkt koppling till fältvärde
- Poster utan koppling --> beräknas (t.ex. förlust = anskaffningsvärde - försäljningspris)
- Stödjer beräkningsuttryck som `"calc": "acquisition_value - selling_price"`

### 4. Uppdatera routing i `index.ts`

Nuvarande flöde (book_expense/book_sale/book_payment):

```text
Mall matchad + amount finns? --> Förslag
Mall matchad + amount saknas? --> "Vilket belopp?"
```

Nytt flöde:

```text
Mall matchad --> analyzeRequiredFields()
  --> Alla fält finns? --> calculateTemplateAmounts() --> Förslag med korrekta belopp
  --> Fält saknas? --> Fråga om nästa fält med mallens prompt-text
```

### 5. Uppdatera `formatBookingProposal`

Istället för att anropa `calculateEntryAmount(entry, amount)` för alla poster, ta emot redan beräknade belopp per post. Visa rätt belopp i tabellen.

### 6. Konversationskontext för flerstegsflödet

Vid fråga om fält, inkludera en strukturerad markör i AI-svaret:

```
❓ Vad var anskaffningsvärdet (det du betalade for fondandelarna)?
<!-- field:acquisition_value template:Försäljning fond med förlust -->
```

När användaren svarar, letar index.ts efter denna markör i historiken och extraherar:
- Vilket fält som besvarades
- Vilken mall som avses
- Samlar ihop alla hittills besvarade fält

### 7. Uppdatera befintlig fondmall

Sätt `required_fields` på "Försäljning fond med förlust" och lägg till beräkningsregel for förlustposten.

## Filändringar

| Fil | Ändring |
|-----|---------|
| `supabase/migrations/...` | Ny kolumn `required_fields` (jsonb) |
| `supabase/functions/chat-assistant/index.ts` | Nytt flöde med `analyzeRequiredFields` och konversationskontext |
| `supabase/functions/chat-assistant/response-formatter.ts` | `formatBookingProposal` tar emot beräknade belopp per post |
| `supabase/functions/_shared/template-matcher.ts` | Ingen ändring -- mallen matchas som idag |
| `supabase/functions/_shared/types.ts` | Ny typ `RequiredField` och `FieldAnalysisResult` |
| SQL data-update | Sätt `required_fields` på fondförlustmallen |

## Bakåtkompatibilitet

Mallar utan `required_fields` fungerar exakt som idag (ett belopp). Systemet faller tillbaka till nuvarande logik om fältet är null/tomt. Inga breaking changes.

