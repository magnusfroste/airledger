# Analys av kontoplanen - Databas vs BAS 2024 CSV

## Fas 1: Inventering och analys

### Databas översikt:
- Totalt antal konton: 415+
- Struktur: Alla konton är i standardiserat format med account_code, account_name, account_type, account_category, normal_balance

### CSV översikt (BAS 2024):
- Total filer rader: 1326 (inklusive headers och struktur)
- Format: Semikolon-separerad med flera strukturnivåer
- Många rader är kategoribeskrivningar, inte faktiska konton

## Identifierade problem hittills:

### ✅ KORRIGERADE:
1. **2091** - Databas hade "Ackumulerade överavskrivningar", nu korrigerat till "Balanserad vinst eller förlust"
2. **2098** - Databas hade "Andra obeskattade reserver", nu korrigerat till "Vinst eller förlust från föregående år"

### BEHÖVER KONTROLLERAS:
Baserat på CSV-granskning behöver följande områden verifieras:

#### A. Tillgångar (1xxx)
- Kontrollera att alla immateriella tillgångar (10xx) har rätt namn
- Verifiera byggnader och mark (11xx)
- Maskiner och inventarier (12xx)
- Finansiella tillgångar (13xx)

#### B. Eget kapital och skulder (2xxx)
- Kontrollera eget kapital struktur (20xx)
- Verifiera långfristiga skulder (23xx) - nyligen tillagd
- Kortfristiga skulder (24xx)

#### C. Intäkter och kostnader (3xxx-8xxx)
- Stort område med många konton att kontrollera
- Behöver systematisk genomgång

## Nästa steg:
1. Extrahera alla faktiska kontonummer från CSV
2. Jämföra kontonamn systematiskt
3. Identifiera saknade konton
4. Korrigera fel kontonamn
5. Verifiera kategorier och typer

## Status:
🔍 **FAS 1 PÅGÅR** - Grundläggande inventering genomförd