# Air Ledger - Arkitektur och Logikfördelning

## Översikt av den Nya Arkitekturen

Efter refaktoreringen 2025-01-17 har vi centraliserat bokföringslogiken från hårdkodade funktioner till ett mallbaserat system. Detta dokument beskriver var olika typer av logik finns och hur de samverkar.

## Logikfördelning

### 1. AI-Beslutsfat (Minimalt) - `system-prompt.ts`

**Ansvar:** Identifiera transaktionstyp och välja rätt tool/mall

```typescript
// Exempel från den förenklade system-prompten
När användaren nämner:
- "Jag har fakturerat" → identifiera som försäljning, välj rätt försäljningsmall
- "Betalat hyra" → use_transaction_template med "Lokalhyra"  
- "Fått betalning från kund" → save_payment
```

**Vad AI:n INTE längre gör:**
- ❌ Specificera exakta kontokoder
- ❌ Beräkna moms eller andra bokföringsdetaljer
- ❌ Definiera debet/kredit-logik

### 2. Bokföringslogik (Centraliserad) - Transaktionsmallar

**Ansvar:** All specifik bokföringslogik för olika transaktionstyper

#### Systemmallar (Skapade av utvecklare)

```sql
-- Exempel: Försäljning 25% moms
{
  "template_name": "Försäljning 25% moms",
  "template_entries": [
    {
      "account_code": "3001",
      "account_name": "Försäljning varor", 
      "credit_amount": "{amount_excluding_vat}",
      "description": "Försäljning"
    },
    {
      "account_code": "2610",
      "account_name": "Utgående moms, 25%",
      "credit_amount": "{vat_amount}",
      "vat_rate": 0.25
    },
    {
      "account_code": "1930", 
      "account_name": "Kundfordringar",
      "debit_amount": "{total_amount}"
    }
  ]
}
```

**Fördelar:**
- ✅ Utvecklare kan enkelt verifiera bokföringslogik
- ✅ Förändringar kräver inte AI-uppdateringar
- ✅ Konsistent bokföring över tid
- ✅ Testbar och dokumenterad logik

#### Användarmallar (Skapade via UI/AI)

Användare kan skapa egna mallar för specifika behov:
- Specialiserade intäktskategori​er
- Branschspecifika kostnader
- Företagsspecifika processer

### 3. Verksamhetslogik - Edge Functions

**Ansvar:** Koordinera mallar, validering, affärsregler

#### `use-transaction-template/index.ts`
```typescript
// Processflöde:
1. Hämta mall från databas
2. Kontrollera om mall har moms-beräkningar
3. Beräkna belopp enligt mallens regler
4. Skapa transaktionsposter
5. Anropa save-general-transaction
6. Registrera mallanvändning
```

#### `save-invoice/index.ts` 
```typescript
// Förenklas till:
1. Identifiera momssats baserat på input
2. Välj rätt försäljningsmall (25%, 12%, 6%, eller momsfri)
3. Delegera till use-transaction-template
4. Returnera resultat
```

### 4. Validering och Säkerhet - Databasnivå

**Ansvar:** Säkerställa datakonsistens och affärsregler

```sql
-- RLS-policies säkerställer användarisolation
-- Triggers uppdaterar statistik automatiskt  
-- Constraints säkerställer dataformatintegritet
```

## Utvecklarflöde för Nya Transaktionstyper

### Scenario: Lägg till "Försäljning utomlands (0% moms)"

#### Steg 1: Skapa systemmall
```sql
INSERT INTO airledger_transaction_templates (
  template_name,
  description,
  template_entries,
  keywords,
  is_system_template
) VALUES (
  'Försäljning EU (0% moms)',
  'Försäljning inom EU med omvänd skattskyldighet',
  '[
    {
      "account_code": "3001",
      "account_name": "Försäljning varor",
      "credit_amount": "{total_amount}"
    },
    {
      "account_code": "1930",
      "account_name": "Kundfordringar", 
      "debit_amount": "{total_amount}"
    }
  ]'::jsonb,
  ARRAY['export', 'eu', 'omvänd', 'skattskyldighet'],
  true
);
```

#### Steg 2: Uppdatera AI-vägledning (valfritt)
```typescript
// I system-prompt.ts - endast om särskild identifiering behövs
"För EU-export eller omvänd skattskyldighet → använd 'Försäljning EU (0% moms)'"
```

#### Steg 3: Testa
- AI:n kommer automatiskt föreslå mallen baserat på nyckelord
- Ingen kod behöver ändras i edge functions
- Utvecklaren kan verifiera bokföringen direkt i mallen

## Underhållsfördelar

### För Utvecklare

```typescript
// Förr: Ändra bokföringslogik krävde
1. Ändra system-prompt.ts
2. Ändra save-invoice/index.ts  
3. Testa AI-beteende
4. Hoppas på konsistens

// Nu: Ändra bokföringslogik kräver
1. Uppdatera mall i databas
2. Klart!
```

### För Bokföringsexperter

- **Transparens**: All bokföringslogik synlig i mallarna
- **Verifierbar**: Enkelt att kontrollera mot BAS-kontoplanen
- **Testbar**: Mallar kan testas oberoende av AI
- **Dokumenterad**: Mallarnas struktur är självdokumenterande

### För Användare

- **Förutsägbar**: Samma input ger samma resultat
- **Anpassningsbar**: Kan skapa egna mallar för specifika behov
- **Transparent**: Kan se exakt vilka konton som påverkas

## Felhantering och Debugging

### När Bokföringen Blir Fel

#### 1. Kontrollera Mall
```sql
-- Hitta vilken mall som användes
SELECT template_name, template_entries 
FROM airledger_transaction_templates t
JOIN airledger_template_usage u ON t.id = u.template_id
WHERE u.transaction_id = 'transaction-id';
```

#### 2. Verifiera Mallens Logik
```json
// Kontrollera template_entries för korrekthet
{
  "account_code": "rätt konto?",
  "debit_amount": "rätt belopp?",
  "credit_amount": "rätt belopp?"
}
```

#### 3. Korrigera Mall
```sql
-- Uppdatera mallen för framtida transaktioner  
UPDATE airledger_transaction_templates 
SET template_entries = 'korrigerad struktur'
WHERE template_name = 'problematisk mall';
```

### När AI Väljer Fel Mall

#### 1. Kontrollera Nyckelord
```sql
SELECT template_name, keywords
FROM airledger_transaction_templates
WHERE 'användarens ord' = ANY(keywords);
```

#### 2. Förbättra Nyckelord
```sql
UPDATE airledger_transaction_templates 
SET keywords = keywords || ARRAY['nya nyckelord']
WHERE template_name = 'rätt mall';
```

#### 3. Uppdatera AI-vägledning (sista utväg)
Endast om nyckelord inte är tillräckligt.

## Mäta Systemets Prestanda

### Mallpopularitet
```sql
SELECT template_name, usage_count, last_used_at
FROM airledger_transaction_templates
ORDER BY usage_count DESC;
```

### AI-träffsäkerhet
```sql
-- Hur ofta används förväntade mallar vs fallbacks?
SELECT 
  CASE 
    WHEN template_name LIKE 'Försäljning%' THEN 'Sales Templates'
    WHEN template_name LIKE 'Lokalhyra%' THEN 'Rent Templates'
    ELSE 'Other/Fallback'
  END as category,
  COUNT(*) as usage_count
FROM airledger_template_usage u
JOIN airledger_transaction_templates t ON u.template_id = t.id
GROUP BY category;
```

## Framtida Utveckling

### Automatisk Mallgenerering
AI:n skulle kunna föreslå nya mallar baserat på användarnas unika transaktioner.

### Mallvalidering
Automatiska tester som säkerställer att mallar följer bokföringsprincipen.

### Mallversionering
Hantera ändringar i mallar utan att påverka historiska transaktioner.

### Branschspecifika Mallpaket
Fördefinierade mallar för olika branscher (restaurang, detaljhandel, tjänsteföretag).