
# Mallskapande Guide - AirLedger AI

## Översikt

Transaktionsmallar är hjärtat i AirLedger AI-systemet. Denna guide beskriver hur du skapar, validerar och underhåller mallar för optimal AI-prestanda.

## Mallstruktur

### Grundläggande Struktur

```json
{
  "template_name": "Beskrivande namn",
  "description": "Detaljerad beskrivning av mallens syfte",
  "category": "Kategori för organisering",
  "keywords": ["nyckelord", "för", "AI-matching"],
  "is_system_template": false,
  "template_entries": [
    {
      "account_code": "1234",
      "account_name": "Kontonamn",
      "type": "debit|credit",
      "description": "Postbeskrivning",
      "vat_calculation": "optional VAT handling"
    }
  ]
}
```

### Obligatoriska Fält

| Fält | Beskrivning | Exempel |
|------|-------------|---------|
| `template_name` | Unikt, beskrivande namn | "Lokalhyra", "Telekommunikation" |
| `description` | Förklaring av mallens användning | "Mall för bokföring av månatlig lokalhyra" |
| `category` | Organisatorisk kategori | "Kostnader", "Intäkter", "Balansposter" |
| `template_entries` | Array av bokföringsposter | Se detaljerad struktur nedan |

### Template Entries Structure

```json
{
  "account_code": "5010",           // BAS-kontonummer
  "account_name": "Lokalhyror",     // Kontonamn från BAS
  "type": "debit",                  // "debit" eller "credit"
  "description": "Hyra januari",   // Beskrivning för posten
  "vat_calculation": "exclude_vat"  // Valfritt: VAT-beräkning
}
```

## Malltyper

### 1. Enkla Kostnadsmallar

```json
{
  "template_name": "Kontorsmaterial",
  "description": "Inköp av kontorsmaterial och förbrukningsmaterial",
  "category": "Kostnader",
  "keywords": ["kontorsmaterial", "papper", "pennor", "förbrukning"],
  "template_entries": [
    {
      "account_code": "6110",
      "account_name": "Kontorsmaterial",
      "type": "debit",
      "description": "Kontorsmaterial"
    },
    {
      "account_code": "1930",
      "account_name": "Checkkonto",
      "type": "credit",
      "description": "Betalning kontorsmaterial"
    }
  ]
}
```

### 2. Mallar med Momsberäkning

```json
{
  "template_name": "Försäljning 25% moms",
  "description": "Försäljning av varor/tjänster med 25% moms",
  "category": "Intäkter",
  "keywords": ["försäljning", "faktura", "kund", "intäkt"],
  "template_entries": [
    {
      "account_code": "1510",
      "account_name": "Kundfordringar",
      "type": "debit",
      "description": "Kundfordran",
      "vat_calculation": "total_amount"
    },
    {
      "account_code": "3001",
      "account_name": "Försäljning varor",
      "type": "credit",
      "description": "Försäljning",
      "vat_calculation": "exclude_vat"
    },
    {
      "account_code": "2610",
      "account_name": "Utgående moms 25%",
      "type": "credit",
      "description": "Utgående moms",
      "vat_calculation": "vat_only"
    }
  ]
}
```

### 3. Komplexa Mallar med Flera Poster

```json
{
  "template_name": "Löneutbetalning",
  "description": "Månatlig löneutbetalning med sociala avgifter",
  "category": "Löner",
  "keywords": ["lön", "salary", "anställd", "avlöning"],
  "template_entries": [
    {
      "account_code": "7210",
      "account_name": "Löner",
      "type": "debit",
      "description": "Bruttolön"
    },
    {
      "account_code": "7510",
      "account_name": "Sociala avgifter",
      "type": "debit", 
      "description": "Arbetsgivaravgifter"
    },
    {
      "account_code": "2710",
      "account_name": "Personalskatt",
      "type": "credit",
      "description": "Preliminärskatt"
    },
    {
      "account_code": "1930",
      "account_name": "Checkkonto",
      "type": "credit",
      "description": "Nettolön"
    }
  ]
}
```

## VAT-beräkningar

### Tillgängliga VAT-typer

| Typ | Beskrivning | Användning |
|-----|-------------|------------|
| `total_amount` | Hela beloppet | Kundfordringar, leverantörsskulder |
| `exclude_vat` | Belopp exklusive moms | Försäljning, inköp |
| `vat_only` | Endast momsbeloppet | Ingående/utgående moms |

### VAT-beräkningslogik

```typescript
// Exempel: 1250 kr inklusive 25% moms
const totalAmount = 1250
const vatRate = 0.25
const excludingVat = totalAmount / (1 + vatRate) // 1000 kr
const vatAmount = totalAmount - excludingVat     // 250 kr

// Tillämpning i mall:
// total_amount: 1250 kr
// exclude_vat: 1000 kr  
// vat_only: 250 kr
```

## Nyckelord och AI-matching

### Effektiva Nyckelord

```json
{
  "keywords": [
    // Primära termer
    "hyra", "lokalhyra", "uthyrning",
    // Variationer
    "hyr", "hyrd", "hyror",
    // Branschtermer  
    "kontor", "lokal", "fastighet",
    // Engelska motsvarigheter
    "rent", "rental", "lease"
  ]
}
```

### Nyckelordsstrategi

1. **Specifikt först**: Använd specifika termer för exakt matching
2. **Variationer**: Inkludera olika böjningsformer
3. **Synonymer**: Lägg till relevanta synonymer
4. **Engelska termer**: För internationella användare

## Validering och Kvalitetskontroll

### Automatisk Validering

Systemet validerar automatiskt:
- Att debet = kredit för balanserade poster
- Att kontonummer finns i BAS-kontoplanen
- Att normal balance överensstämmer med posttyp
- Att VAT-beräkningar är korrekta

### Manuell Granskning

Innan systemmallar aktiveras:
1. **Logisk granskning**: Är bokföringslogiken korrekt?
2. **Testning**: Testa med olika belopp och scenarier
3. **AI-testning**: Verifiera att AI väljer rätt mall
4. **Användarfeedback**: Samla feedback från testanvändare

### Vanliga Fel att Undvika

❌ **Felaktiga kontonummer**
```json
"account_code": "1234" // Kontrollera mot BAS-planen
```

❌ **Obalanserade poster** 
```json
// Totalt debit ≠ totalt kredit
```

❌ **Felaktig normal balance**
```json
{
  "account_code": "3001", // Intäktskonto
  "type": "debit"         // Ska vara credit
}
```

✅ **Korrekt struktur**
```json
{
  "account_code": "3001", // Verifierat mot BAS
  "account_name": "Försäljning varor",
  "type": "credit",       // Korrekt för intäktskonto
  "description": "Försäljning"
}
```

## Mallunderhåll

### Versionshantering
- Dokumentera ändringar i mallar
- Behåll kompatibilitet med historiska transaktioner
- Testa AI-beteende efter ändringar

### Prestandaövervakning
- Övervaka mallanvändningsstatistik
- Identifiera oanvända mallar
- Optimera för vanligaste användningsfall

### Kontinuerlig Förbättring
- Analysera användarmönster
- Uppdatera nyckelord baserat på feedback
- Lägg till nya mallar för identifierade behov

Genom att följa denna guide säkerställer du att mallarna fungerar optimalt med AI-systemet och ger användarna en smidig bokföringsupplevelse.
