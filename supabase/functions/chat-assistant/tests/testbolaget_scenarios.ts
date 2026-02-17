// Testbolaget AB scenarios for Deno backend tests
// Synced with src/data/testbolaget-scenarios.ts + backend-specific test fields

export interface TestScenario {
  id: string;
  quarter: string;
  month: number;
  message: string;
  description: string;
  expected_template: string;
  expected_total: number;
  expect_followup?: string;
  expect_question?: boolean;
  may_clarify?: boolean;
}

export const SCENARIOS: TestScenario[] = [
  // ── Q1: Januari–Mars ──────────────────────────────
  { id: 'q1-01', quarter: 'Q1', month: 1, message: 'Betalt hyra för kontoret 12 500 kr', description: 'Kontorshyra', expected_template: 'Kontorslokal hyra med moms', expected_total: 12500 },
  { id: 'q1-02', quarter: 'Q1', month: 1, message: 'Faktura till Kund AB på 50 000 kr för konsulttjänster', description: 'Försäljning tjänster', expected_template: 'Försäljning tjänster 25%', expected_total: 62500, expect_followup: 'Kundbetalning' },
  { id: 'q1-03', quarter: 'Q1', month: 1, message: 'Köpt kontorsmaterial för 625 kr', description: 'Kontorsmaterial', expected_template: 'Kontorsmaterial inköp', expected_total: 625 },
  { id: 'q1-04', quarter: 'Q1', month: 2, message: 'Mobilabonnemang 499 kr', description: 'Mobilabonnemang', expected_template: 'Mobiltelefon abonnemang', expected_total: 499 },
  { id: 'q1-05', quarter: 'Q1', month: 2, message: 'Lön 35 000 kr brutto för januari', description: 'Lön', expected_template: 'Lön utbetalning', expected_total: 35000, expect_followup: 'Arbetsgivaravgifter', may_clarify: true },
  { id: 'q1-06', quarter: 'Q1', month: 2, message: 'Arbetsgivaravgifter för januari 10 990 kr', description: 'Arbetsgivaravgifter', expected_template: 'Arbetsgivaravgifter', expected_total: 10990, expect_followup: 'F-skatt' },
  { id: 'q1-07', quarter: 'Q1', month: 2, message: 'Betalt F-skatt 10 000 kr', description: 'F-skatt', expected_template: 'F-skatt inbetalning', expected_total: 10000 },
  { id: 'q1-08', quarter: 'Q1', month: 3, message: 'Kund AB har betalat fakturan på 62 500 kr', description: 'Kundbetalning', expected_template: 'Kundbetalning inkommande', expected_total: 62500 },

  // ── Q2: April–Juni ────────────────────────────────
  { id: 'q2-01', quarter: 'Q2', month: 4, message: 'Momsredovisning för Q1, ingående moms 3 375 kr, utgående moms 12 500 kr', description: 'Momsdeklaration Q1', expected_template: 'Momsredovisning', expected_total: 9125 },
  { id: 'q2-02', quarter: 'Q2', month: 4, message: 'Faktura till Klient Beta 75 000 kr för systemutveckling', description: 'Försäljning #2', expected_template: 'Försäljning tjänster 25%', expected_total: 93750 },
  { id: 'q2-03', quarter: 'Q2', month: 5, message: 'Faktura till Startup XYZ 40 000 kr för rådgivning', description: 'Försäljning #3', expected_template: 'Försäljning tjänster 25%', expected_total: 50000 },
  { id: 'q2-04', quarter: 'Q2', month: 5, message: 'Köpt en ny laptop för 15 000 kr', description: 'Laptop', expected_template: 'Inköp dator/laptop', expected_total: 15000 },
  { id: 'q2-05', quarter: 'Q2', month: 6, message: 'Tågbiljett Stockholm–Göteborg 1 200 kr tjänsteresa', description: 'Tågresa', expected_template: 'Tjänsteresa tåg/flyg', expected_total: 1200, expect_followup: 'Hotell' },
  { id: 'q2-06', quarter: 'Q2', month: 6, message: 'Hotell övernattning i Göteborg 1 800 kr', description: 'Hotell', expected_template: 'Hotell tjänsteresa', expected_total: 1800 },
  { id: 'q2-07', quarter: 'Q2', month: 6, message: 'Betalt hyra 12 500 kr för juni', description: 'Kontorshyra juni', expected_template: 'Kontorslokal hyra med moms', expected_total: 12500 },

  // ── Q3: Juli–September ────────────────────────────
  { id: 'q3-01', quarter: 'Q3', month: 7, message: 'Företagsförsäkring 4 800 kr för helåret', description: 'Försäkring', expected_template: 'Företagsförsäkring', expected_total: 4800 },
  { id: 'q3-02', quarter: 'Q3', month: 8, message: 'Faktura till Storföretag AB 90 000 kr för projektledning', description: 'Försäljning #4', expected_template: 'Försäljning tjänster 25%', expected_total: 112500 },
  { id: 'q3-03', quarter: 'Q3', month: 8, message: 'Faktura till Nykund 30 000 kr för teknisk analys', description: 'Försäljning #5', expected_template: 'Försäljning tjänster 25%', expected_total: 37500 },
  { id: 'q3-04', quarter: 'Q3', month: 9, message: 'Friskvårdsbidrag gym 2 500 kr', description: 'Friskvård', expected_template: 'Friskvårdsbidrag', expected_total: 2500 },
  { id: 'q3-05', quarter: 'Q3', month: 9, message: 'Extern representation middag med kund 1 200 kr', description: 'Representation', expected_template: 'Extern representation mat', expected_total: 1200 },

  // ── Q4: Oktober–December (bokslut) ────────────────
  { id: 'q4-01', quarter: 'Q4', month: 10, message: 'Faktura till Klient Beta 60 000 kr för underhåll', description: 'Försäljning #6', expected_template: 'Försäljning tjänster 25%', expected_total: 75000 },
  { id: 'q4-02', quarter: 'Q4', month: 10, message: 'Lön 35 000 kr brutto för september', description: 'Löneutbetalning', expected_template: 'Lön utbetalning', expected_total: 35000, expect_followup: 'Arbetsgivaravgifter', may_clarify: true },
  { id: 'q4-03', quarter: 'Q4', month: 11, message: 'Betalt hyra 12 500 kr för november', description: 'Kontorshyra november', expected_template: 'Kontorslokal hyra med moms', expected_total: 12500 },
  { id: 'q4-04', quarter: 'Q4', month: 11, message: 'Bokför momsredovisning Q3: ingående moms 4 200 kr och utgående moms 37 500 kr, betala mellanskillnaden', description: 'Momsdeklaration Q3', expected_template: 'Momsredovisning', expected_total: 33300 },
  { id: 'q4-05', quarter: 'Q4', month: 12, message: 'Bokför avskrivning på datorer med 5 000 kr för räkenskapsåret', description: 'Avskrivning', expected_template: 'Avskrivning datorer', expected_total: 5000 },
  { id: 'q4-06', quarter: 'Q4', month: 12, message: 'Bokför upplupna kostnader för revision 15 000 kr', description: 'Upplupna kostnader', expected_template: 'Upplupna kostnader bokslut', expected_total: 15000 },
  { id: 'q4-07', quarter: 'Q4', month: 12, message: 'Bokför avsättning till periodiseringsfond 50 000 kr', description: 'Periodiseringsfond', expected_template: 'Avsättning periodiseringsfond', expected_total: 50000 },
  { id: 'q4-08', quarter: 'Q4', month: 12, message: 'Bokför skatteavsättning bolagsskatt 41 200 kr baserat på resultat 200 000 kr', description: 'Bolagsskatt', expected_template: 'Skatteavsättning bolagsskatt', expected_total: 41200 },

  // ── Kantfall ──────────────────────────────────────
  { id: 'edge-01', quarter: 'edge', month: 0, message: 'Faktura till Ny Kund 20 000 kr för konsulttjänster', description: 'Kort format – igenkänning', expected_template: 'Försäljning tjänster 25%', expected_total: 25000 },
  { id: 'edge-02', quarter: 'edge', month: 0, message: 'Köpt kaffe och fika till kontoret 245 kr', description: 'Litet belopp', expected_template: 'Kontorsmaterial inköp', expected_total: 245 },
  { id: 'edge-03', quarter: 'edge', month: 0, message: 'Kreditfaktura till Kund AB -5 000 kr för felaktig faktura', description: 'Kreditfaktura', expected_template: 'Kreditfaktura', expected_total: 5000 },
  { id: 'edge-04', quarter: 'edge', month: 0, message: 'Kundförlust Dålig Kund AB 25 000 kr, konstaterad förlust', description: 'Kundförlust', expected_template: 'Kundförlust', expected_total: 25000 },

  // ── Fråge-scenarier (AI ska fråga efter saknad info) ──
  { id: 'question-01', quarter: 'edge', month: 0, message: 'hyra', description: 'Saknar belopp', expected_template: '', expected_total: 0, expect_question: true },
  { id: 'question-02', quarter: 'edge', month: 0, message: 'faktura', description: 'Saknar allt', expected_template: '', expected_total: 0, expect_question: true },
];
