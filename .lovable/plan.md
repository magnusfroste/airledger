

# Live Demo: "Testbolaget AB -- Ett helt bokforingsår"

## Oversikt

Skapa ett dubbelanvandnings-system:
1. **Backend-testsvit** (Deno) -- for kvalitetssakring, kor tyst, ger pass/fail
2. **Frontend demo-mode** -- spelar upp scenarierna i det riktiga chattgranssnittet sa besokare (och teamet) ser Air bokfora i realtid

Bada delar anvander samma scenariodata.

---

## Arkitektur

```text
testbolaget_scenarios.ts (delad data)
       |
       +---> Deno-tester (backend, verifierar korrekthet)
       |
       +---> DemoRunner (frontend, visuell uppspelning i chatten)
```

## Del 1: Scenariodata (delad)

**Ny fil:** `src/data/testbolaget-scenarios.ts`

En array med ~35 scenarier, grupperade per kvartal:

```text
interface DemoScenario {
  id: string
  quarter: string          // "Q1", "Q2", "Q3", "Q4"
  month: number
  message: string          // Meddelandet som skickas till Air
  description: string      // Kort forklaring for publiken ("Hyra for kontoret")
  expected_template: string // For backend-test: forvantad mall
  expected_total: number   // For backend-test: forvantad totalsumma
}
```

Scenarierna inkluderar:
- Q1: Hyra, forsaljning, kontorsmaterial, lon, F-skatt, kundbetalning
- Q2: Momsredovisning, laptop, tjansteresa, hotell
- Q3: Forsakring, friskvard, representation
- Q4: Bokslut -- avskrivning, upplupna kostnader, periodiseringsfond, skatteavsattning
- Kantfall: utan belopp, dubbletter, kreditfaktura

---

## Del 2: Frontend Demo Runner

### Ny komponent: `DemoRunner.tsx`

En kontrollpanel som injiceras i ChatInterface nar demo-mode ar aktivt:

**Funktionalitet:**
- **Play/Pause-knapp** -- startar/pausar uppspelningen
- **Hastighetsvaljare** -- "Snabb" (2s), "Normal" (4s), "Steg-for-steg" (manuellt)
- **Kvartalshopp** -- hoppa direkt till Q1/Q2/Q3/Q4
- **Framstegsindikaor** -- "Scenario 7 av 35 -- Q1 Mars"
- **Resultatsammanfattning** -- efter varje kvartal visas en liten sammanfattning

### Flode:

1. Anvandaren aktiverar demo-mode (via URL-parameter `?demo=testbolaget` eller en knapp)
2. DemoRunner visar en introduktionsruta: "Testbolaget AB -- IT-konsult, omsattning 1,2 MSEK"
3. For varje scenario:
   a. Visar en liten etikett: "Q1 Januari -- Kontorshyra"
   b. Skickar meddelandet till den riktiga `chat-assistant` edge function
   c. Renderar svaret i chatten (precis som vanligt)
   d. Vantar 3-4 sekunder (konfigurerbart)
   e. Gar vidare till nasta scenario
4. Mellan kvartalen visas en sammanfattning: "Q1 klart -- 8 transaktioner bokforda, 127 500 kr omsattning"
5. Efter Q4 visas slutsammanfattning med arsbokslut

### Integration med ChatInterface:

```text
ChatInterface
  |
  +-- [demo-mode aktiv?]
  |     |
  |     +-- DemoRunner (kontrollpanel overst)
  |     |     +-- Play/Pause, hastighet, framsteg
  |     |
  |     +-- MessageList (vanlig rendering av meddelanden)
  |     +-- InputArea (doljs eller inaktiveras under demo)
  |
  +-- [vanlig mode]
        +-- MessageList + InputArea (som idag)
```

### Aktivering:

- **URL-parameter:** `/chat?demo=testbolaget` -- for saljdemos
- **Admin-knapp:** I admin-panelen, en "Kor demo"-knapp
- **Landing page:** Ersatt (eller komplettera) nuvarande DemoChat med en "Se Air i aktion"-knapp som oppnar demo-mode

---

## Del 3: Backend-testsvit (Deno)

**Nya filer:**
- `supabase/functions/chat-assistant/tests/testbolaget_scenarios.ts` -- kopia av scenariodata (Deno-kompatibel)
- `supabase/functions/chat-assistant/tests/testbolaget_test.ts` -- testfilen

### Vad testerna verifierar:

For varje scenario:
1. **Anropa edge function** med scenariots meddelande
2. **Kontrollera intent** -- ratt intent returneras
3. **Parsa bokforingsforslaget** ur AI-svaret
4. **Verifiera balansering** -- summa debet === summa kredit
5. **Verifiera totalbelopp** -- overensstammer med forvantning
6. **Kontrollera follow-up** -- om scenario har forvantad follow-up, kontrollera att den namns

### Begransningar:

- Testerna kor mot den deployade edge function (integrationstester)
- Kraver autentisering (testanvandare)
- AI-svar ar icke-deterministiska, sa vi testar struktur och matematik, inte exakt text

---

## Del 4: Implementationsordning

### Steg 1: Scenariodata
Skapa den delade scenario-arrayen med alla 35 scenarier.

### Steg 2: DemoRunner-komponent
Bygg den visuella demo-runnern:
- Play/pause/hastighet
- Kvartalsetiketter och sammanfattningar
- Integration med ChatInterface

### Steg 3: Aktiveringsmekanismer
- URL-parameter-stod i Chat.tsx
- Eventuell knapp pa landing page

### Steg 4: Backend-tester
Skapa Deno-testfilen som anvander samma scenarier for automatiserad verifiering.

---

## Sekundara effekter

- **Sales demo**: Visa potentiella kunder hur Air hanterar ett helt ar pa 2 minuter
- **Regressionstest**: Om en mallandring gar sonder, syns det bade visuellt och i testerna
- **Onboarding**: Nya anvandare kan kora demon for att forsta hur Air fungerar
- **Dokumentation**: Scenarierna ar levande dokumentation av alla bokforingsscenarion

