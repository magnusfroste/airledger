# AirLedger AI - Designspecifikation för robust mallbaserad bokföring

## KÄRNPRINCIP: "Single Source of Truth"
Alla konteringsförslag MÅSTE komma från transaktionsmallar i databasen. Inga hårdkodade kontonummer i kod eller prompts.

## 1. MALLBASERAT SYSTEM

### Grundprinciper:
- **Alla** transaktioner styrs av mallar från `airledger_transaction_templates`
- Edge functions får ALDRIG innehålla hårdkodade kontonummer
- System prompt får ALDRIG innehålla specifika kontonummer som exempel
- AI:n MÅSTE alltid hämta och visa mallens exakta poster innan bokföring

### Undantag:
- `save_opening_balance` - för ingående balanser (kräver kontonummer)
- `save_general_transaction` - för komplexa transaktioner utan mallar

## 2. FUNKTIONSOMSTRUKTURERING

### Borttagna funktioner:
- ✅ `save-invoice` → Ersatt med mall "Fakturering kund"
- ✅ `save-payment` → Ersatt med mall "Kundbetalning"

### Kvarvarande funktioner:
- `use_transaction_template` - Primär funktion för alla vanliga transaktioner
- `save_general_transaction` - För komplexa transaktioner utan befintlig mall
- `save_opening_balance` - För ingående balanser

## 3. MALLSTANDARDER

### Mall-krav:
- Varje affärshändelse har sin egen mall
- Mallarna definierar EXAKT vilka konton som används
- Momssatser och beräkningar definieras i mallarna
- Användaren kan anpassa mallar utan kodändringar

### Systemmallar som ska finnas:
- Fakturering kund (ersätter save-invoice)
- Kundbetalning (ersätter save-payment)
- Lokalhyra
- Telekommunikation
- Kontorsmaterial
- Programvara
- Konsultarvoden
- Försäkringar
- m.fl.

## 4. AI-BETEENDE

### Arbetsflöde:
1. AI:n identifierar händelse
2. Söker passande mall
3. Hämtar mallens struktur från databasen
4. Visar exakta poster för användaren
5. Bekräftar med användaren
6. Bokför med `use_transaction_template`

### Principer:
- Vid osäkerhet: Föreslå flera mallar och låt användaren välja
- Aldrig anta kontonummer - alltid hämta från mall
- ALLTID visa mallens poster innan bokföring
- ALDRIG hårdkoda specifika kontonummer i svar

## 5. FLEXIBILITET OCH UNDERHÅLL

### Fördelar:
- Nya transaktionstyper = nya mallar, ingen kodändring
- Kontoplanändringar hanteras via malluppdateringar
- Företagsspecifika anpassningar via mallsystemet
- Konsistens över tid
- Enkel underhåll

### Användarkontroll:
- Användare kan skapa egna mallar
- Systemmallar kan anpassas
- Mallvalidering säkerställer korrekthet

## 6. VALIDERING OCH KONTROLL

### Säkerhetsfunktioner:
- Template validation säkerställer korrekt uppbyggnad
- Deduplicering förhindrar flera identiska transaktioner
- Audit trail för alla ändringar i mallar
- RLS-policys skyddar användardata

### Kontrollmekanismer:
- Mallarna valideras innan de används
- Balansjuster kontrolleras (debit = kredit)
- Felhantering för saknade mallar
- Logging för felsökning

## 7. IMPLEMENTERINGSSTATUS

### ✅ Genomfört:
- Borttaget `save-invoice` edge function
- Borttaget `save-payment` edge function
- Uppdaterat system prompt att inte innehålla specifika kontonummer
- Uppdaterat function definitions att ta bort gamla funktioner
- Uppdaterat function handlers att ta bort gamla hanterare
- Skapat designspecifikation

### 🔄 Nästa steg:
- Verifiera att alla systemmallar finns i databasen
- Testa att AI:n använder mallar korrekt
- Dokumentera mallskapande för användare

## 8. EXEMPEL PÅ KORREKT ANVÄNDNING

```
Användare: "Betalat hyra 8000 kr"

AI: "Jag ser att detta passar mallen 'Lokalhyra'. Låt mig hämta mallens struktur..."
[AI hämtar mall från databasen]
AI: "Enligt mallen 'Lokalhyra' blir bokföringsposterna:
• Debet: 5010 Lokalhyror 8000 kr
• Kredit: 1930 Checkkonto 8000 kr
Är detta korrekt så bokför jag transaktionen med use_transaction_template?"

Användare: "Ja"

AI: [Anropar use_transaction_template med templateName="Lokalhyra", amount=8000]
```

Detta ger en robust, underhållbar och flexibel AI-assistent som följer "Single Source of Truth"-principen.