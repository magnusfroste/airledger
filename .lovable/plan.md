
# Lägg till "Klistra in"-flik i importdialogen

## Sammanfattning
Utökar den befintliga importdialogen med en andra flik -- "Klistra in data" -- där användaren kan copy/paste CSV-data direkt från Google Sheets, Excel eller en texteditor. Samma validering och förhandsvisning som filuppladdningen.

## Vad ändras?

Importdialogen får två flikar:
1. **Ladda upp fil** (befintlig funktionalitet, oförändrad)
2. **Klistra in data** (nytt -- textarea med placeholder-exempel)

```text
+-----------------------------------------------+
|  Importera ingående balanser                   |
|                                                |
|  [Ladda upp fil]  [Klistra in data]            |
|                                                |
|  +-------------------------------------------+ |
|  | account_code,account_name,opening_bala...  | |
|  | 1510,Kundfordringar,25000,debit            | |
|  | 1930,Företagskonto,150000,debit            | |
|  | 2440,Leverantörsskulder,30000,credit       | |
|  +-------------------------------------------+ |
|                                                |
|  [Validera & förhandsgranska]                  |
|                                                |
|  (samma preview-tabell som idag)               |
+-----------------------------------------------+
```

## Teknisk plan

### Fil: `src/pages/OpeningBalances.tsx`

**Nya state-variabler:**
- `importMode`: `'file' | 'paste'` -- styr aktiv flik
- `pasteText`: `string` -- innehållet i textarea

**Ny funktion:**
- `handlePastePreview()` -- tar `pasteText`, skickar till befintliga `parseCSVForPreview()`

**UI-ändringar i importdialogen:**
- Lägg till `Tabs` (redan finns som UI-komponent) med två flikar
- Flik 1: Befintlig filinput (oförändrad)
- Flik 2: `Textarea` med placeholder som visar exempelformat + en "Förhandsgranska"-knapp
- Resten av dialogen (preview-tabell, import-knapp) delas av båda flikarna

**Placeholder-text i textarea:**
```
account_code,account_name,opening_balance,balance_type
1510,Kundfordringar,25000,debit
1930,Företagskonto,150000,debit
2440,Leverantörsskulder,30000,credit
```

## Filer som ändras
- `src/pages/OpeningBalances.tsx` -- enda filen

## Inga nya beroenden
Tabs-komponenten och Textarea finns redan i projektet.
