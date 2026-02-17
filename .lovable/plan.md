
# AirLedger AI -- Fullstandig Systemanalys och Vagkarta

## 1. Nuvarande Arkitektur (Inventering)

### 1.1 Backend: Agent-Orkestrator-Modell

```text
Anvandare
   |
   v
[chat-assistant/index.ts] -- Orkestrator
   |
   +-- classifyIntent() --> AI-baserad intent-klassificering
   |
   +-- routeToAgent() --> Agent Registry
   |       |
   |       +-- BookingAgent   (book_expense, book_sale, book_payment, confirm_booking, opening_balance)
   |       +-- ReportingAgent (vat_report, account_balance, period_reconciliation, year_end, view_report)
   |       +-- AdvisoryAgent  (ask_question, analyze_image, unknown)
   |       +-- DynamicAgent   (admin-konfigurerade via agent_config-tabell)
   |
   +-- logAgentExecution() --> agent_logs (asynkront)
```

### 1.2 Dataflode vid Bokning

```text
Anvandardinput
   |
   v
Intent Classifier (AI + Function Calling)
   |
   v
Template Matcher (4 steg: exakt -> kategori -> nyckelord -> beloppoverride)
   |
   +-- Mall hittad --> Field Analyzer --> Proposal --> Bekraftelse --> use-transaction-template (edge fn)
   |
   +-- Ingen mall --> Freeform AI --> save-general-transaction (edge fn)
```

### 1.3 Kontextlager (vad AI:n "vet")

| Kontextkalla | Data | Injiceras var |
|---|---|---|
| Profil | Foretagsnamn, bransch | buildBookkeepingContext |
| Mallar (103 st, 22 kategorier) | Namn, poster, nyckelord | buildLightContext + buildBookkeepingContext |
| Senaste transaktioner (20 st) | Datum, beskrivning, belopp | buildBookkeepingContext |
| BAS-kontoplan (1222 konton) | Koder, namn, typ, normalbalans | buildBookkeepingContext |
| Ingaende balanser | Konto, belopp, typ | buildBookkeepingContext |
| Momsammanfattning | Utg/Ing/Netto for kvartalet | buildBookkeepingContext |
| Kontosaldon (Financial Snapshot) | IB + debet - kredit per konto | buildFinancialSnapshot |
| Leverantorsmonster (NY) | Vendor -> mall, snittbelopp, frekvens | buildBookkeepingContext |
| Mallpreferenser (NY) | Mest anvanda mallar | buildBookkeepingContext |

### 1.4 Valideringsmekanismer (befintliga)

| Kontroll | Plats | Typ |
|---|---|---|
| Debet = Kredit | save-general-transaction | Hard (blockerar) |
| Kontokod existerar i BAS | save-general-transaction | Hard (blockerar) |
| Dubblettskydd (5 min) | save-general-transaction | Hard (returnerar befintlig) |
| Negativa belopp | save-general-transaction | Hard (blockerar) |
| Beloppbaserade overrides | template-matcher (prisbasbelopp) | Auto-switch mall |
| DB-drivna varningsregler | template-matcher (warning_rules) | Soft (visas i forslag) |
| In-memory deduplicering | deduplication.ts | Per edge function-anrop |

### 1.5 Frontend-struktur

| Sida | Funktion |
|---|---|
| / (LandingPage) | Landning, demo-chatt |
| /chat | Huvudgranssnitt -- AI-konversation |
| /transactions | Transaktionslista |
| /templates | Mallhantering |
| /reports | Resultatrakning |
| /balance-sheet | Balansrakning |
| /general-ledger | Huvudbok |
| /opening-balances | Ingaende balanser |
| /settings | Installningar + profil |
| /subscription | Prenumerationshantering |
| /admin | Admin (AI-provider, prompter, agenter, mallar, varningsregler, SEO, anvandare) |

### 1.6 Edge Functions (14 st)

| Funktion | Syfte |
|---|---|
| chat-assistant | Orkestrator + agenter |
| analyze-receipt | Kvittoanalys (vision) |
| analyze-bank-statement | Bankutdragstolkning (vision) |
| classify-document | Dokumentklassificering |
| save-transaction | Enkel transaktion |
| save-general-transaction | Komplex transaktion (fria poster) |
| use-transaction-template | Mallbaserad transaktion |
| save-opening-balance | Ingaende balanser |
| import-bas-accounts | Kontoplansimport |
| check-subscription | Prenumerationskontroll |
| create-checkout / customer-portal | Stripe-integration |
| export-templates / import-templates / validate-templates | Mallhantering |
| voice-to-text | Rostigenkanning |
| get-seo-settings | SEO-metadata |

---

## 2. Identifierade Gap och Prioriteringar

### GAP 1: Mallbiblioteket ar underutnyttjat (HOGSTA PRIORITET)

**Problem:** 103 mallar finns, men bara 1 har `required_fields` och bara 1 har `follow_up_templates`. Det innebar att:
- 102 mallar behandlar allt som ett enda belopp -- trots att manga transaktioner har flera datapunkter (t.ex. forsaljning av inventarier kraver bade anskaffningsvarde och forsaljningspris)
- Foljdtransaktioner (t.ex. "betala moms efter momsrapport") ar nastan helt oaktiverade

**Atgard:** Systematiskt berika nyckelmallar med `required_fields` och `follow_up_templates`. Detta gor AI:n smartare utan att andra en enda rad kod -- det ar ren data.

**Specifika mallar att berika:**
- Forsaljning med moms-mallar (behoer required_fields for att skilja netto/brutto)
- Lonetransaktioner (bruttolo, skatt, arbetsgivaravgifter)
- Boksluts-mallar (follow_up_templates: avskrivning -> periodisering -> skatteavsattning)
- Skattetransaktioner (follow_up_templates mellan F-skatt, slutlig skatt, skattekonto)

### GAP 2: Konversationshistoriken skickas men lagras fragmenterat

**Problem:** Chatten sparar meddelanden i `airledger_messages` med `conversation_id`, men:
- Bara de 20 senaste transaktionerna injiceras i kontexten
- AI:n har ingen "minne" av vad den gjort -- om en session avbryts och aterupptas, tappar den traden
- Konversationshistoriken skickas fran frontend, inte fran databasen

**Atgard:** Forbattra kontextbyggaren att inkludera en kort sammanfattning av senaste konversationens bokningsaktivitet ("Du har bokfort 3 transaktioner idag: hyra 8000kr, el 1200kr, telefon 450kr").

### GAP 3: Token-effektivitet -- hela kontoplanen skickas

**Problem:** `buildBookkeepingContext` skickar alla 1222 BAS-konton till AI:n. Det ar ca 6000+ tokens som nistan aldrig behovs. AI:n anvander mallar for kontering, inte ra kontokoder.

**Atgard:** Skicka bara konton som faktiskt forekommit i anvandarens transaktioner + konton i aktiva mallar. Sparar ca 80% av kontokontexten.

### GAP 4: Freeform-bokning ar en svag punkt

**Problem:** Nar ingen mall matchar, skickar booking-agent hela kontexten till AI:n och later den "skriva" poster fritt. Detta ar den enda vagen dar AI-hallucinationer kan leda till felaktiga kontokoder. Valideringen i `save-general-transaction` fangar ogiltiga koder, men inte "rimliga men fel" koder.

**Atgard:** Nar freeform-bokning sker, logga att ingen mall matchade och flagga det i admin-panelen sa att en administrator kan skapa ratt mall. Over tid minskar freeform-fallen till nara noll.

### GAP 5: Saknar proaktivitet

**Problem:** Air reagerar bara -- den tar aldrig initiativ. En autonom assistent borde kunna saga "Du har 3 obetalda leverantorsfakturor som forfollar inom 7 dagar" nar anvandaren oppnar chatten.

**Atgard:** Lagg till en "startup check" i orkestratorn som analyserar anvandardata vid sessionstart och genererar proaktiva forslag.

---

## 3. Prioriterad Vagkarta

### Fas 1: Data-enrichment (ingen kodandring kravs)
- Berika 15-20 nyckelmallar med `required_fields`
- Lagg till `follow_up_templates` for boksluts- och skattekedjan
- Lagg till fler nyckelord pa mallar med laga traff

### Fas 2: Optimera kontexten (sma kodandringar, stor effekt)
- Filtrera BAS-kontoplanen till bara relevanta konton
- Lagg till sessionssammanfattning ("du har bokfort X idag")
- Logga freeform-fall for mallutveckling

### Fas 3: Proaktiv assistent
- Startup-analys: forfallna fakturor, momsfrist, onormala saldon
- Snabbforslag baserat pa leverantorsmonster

### Fas 4: Multi-step planner (bokslut)
- Bryt ner "gor mitt bokslut" till automatiska delsteg
- Human-in-the-loop bekraftelse per steg
- Follow-up-chains for hela bokslutscykeln

---

## 4. Teknisk Sammanfattning

| Dimension | Status | Mognad |
|---|---|---|
| Agentarkitektur (orkestrator + specialister) | Komplett | Hog |
| Mallbibliotek (103 mallar, 22 kategorier) | Strukturellt komplett, data ej berikad | Medel |
| Intent-klassificering (AI + function calling) | Fungerar bra | Hog |
| Kontextmedvetenhet (financial snapshot, leverantorsmonster) | Nyligen forbattrad | Medel |
| Validering (debet=kredit, kontokoder, dubbletter) | Robust pa edge function-niva | Hog |
| Observabilitet (agent_logs, admin dashboard) | Grundlaggande | Medel |
| Proaktivitet | Saknas helt | Lag |
| Token-effektivitet | Ineffektiv (hela kontoplanen) | Lag |
| Freeform-fallback | Funktionell men okontrollerad | Lag |

**Slutsats:** Den storsta forbattringen av Air:s formaga uppnas genom att berika befintliga mallar med `required_fields` och `follow_up_templates` -- det ar ren dataforandring som omedelbart gor AI:n smartare, utan att rora en rad kod. Fas 2 (kontextoptimering) ar nast viktigast for bade kvalitet och kostnad.
