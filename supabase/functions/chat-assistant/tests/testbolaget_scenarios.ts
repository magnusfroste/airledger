// Testbolaget AB scenarios for Deno backend tests
// Mirror of src/data/testbolaget-scenarios.ts (Deno-compatible)

export interface TestScenario {
  id: string;
  quarter: string;
  month: number;
  message: string;
  description: string;
  expected_template: string;
  expected_total: number;
  expect_followup?: string;
  expect_question?: boolean; // AI should ask for missing info
}

export const SCENARIOS: TestScenario[] = [
  // Q1
  { id: 'q1-01', quarter: 'Q1', month: 1, message: 'Betalt hyra för kontoret 12 500 kr', description: 'Kontorshyra', expected_template: 'Kontorslokal hyra med moms', expected_total: 12500 },
  { id: 'q1-02', quarter: 'Q1', month: 1, message: 'Faktura till Kund AB på 50 000 kr för konsulttjänster', description: 'Försäljning tjänster', expected_template: 'Försäljning tjänster 25%', expected_total: 62500 },
  { id: 'q1-03', quarter: 'Q1', month: 1, message: 'Köpt kontorsmaterial för 625 kr', description: 'Kontorsmaterial', expected_template: 'Kontorsmaterial inköp', expected_total: 625 },
  { id: 'q1-04', quarter: 'Q1', month: 2, message: 'Mobilabonnemang 499 kr', description: 'Mobilabonnemang', expected_template: 'Mobiltelefon abonnemang', expected_total: 499 },
  { id: 'q1-05', quarter: 'Q1', month: 2, message: 'Lön 35 000 kr brutto för januari', description: 'Lön', expected_template: 'Lön utbetalning', expected_total: 35000, expect_followup: 'Arbetsgivaravgifter' },
  { id: 'q1-06', quarter: 'Q1', month: 2, message: 'Arbetsgivaravgifter för januari 10 990 kr', description: 'Arbetsgivaravgifter', expected_template: 'Arbetsgivaravgifter', expected_total: 10990 },
  { id: 'q1-07', quarter: 'Q1', month: 2, message: 'Betalt F-skatt 10 000 kr', description: 'F-skatt', expected_template: 'F-skatt inbetalning', expected_total: 10000 },
  { id: 'q1-08', quarter: 'Q1', month: 3, message: 'Kund AB har betalat fakturan på 62 500 kr', description: 'Kundbetalning', expected_template: 'Kundbetalning inkommande', expected_total: 62500 },

  // Q2
  { id: 'q2-02', quarter: 'Q2', month: 4, message: 'Faktura till Klient Beta 75 000 kr för systemutveckling', description: 'Försäljning #2', expected_template: 'Försäljning tjänster 25%', expected_total: 93750 },
  { id: 'q2-03', quarter: 'Q2', month: 5, message: 'Faktura till Startup XYZ 40 000 kr för rådgivning', description: 'Försäljning #3', expected_template: 'Försäljning tjänster 25%', expected_total: 50000 },
  { id: 'q2-04', quarter: 'Q2', month: 5, message: 'Köpt en ny laptop för 15 000 kr', description: 'Laptop', expected_template: 'Inköp dator/laptop', expected_total: 15000 },
  { id: 'q2-05', quarter: 'Q2', month: 6, message: 'Tågbiljett Stockholm–Göteborg 1 200 kr tjänsteresa', description: 'Tågresa', expected_template: 'Tjänsteresa tåg/flyg', expected_total: 1200 },
  { id: 'q2-06', quarter: 'Q2', month: 6, message: 'Hotell övernattning i Göteborg 1 800 kr', description: 'Hotell', expected_template: 'Hotell tjänsteresa', expected_total: 1800 },

  // Q3
  { id: 'q3-01', quarter: 'Q3', month: 7, message: 'Företagsförsäkring 4 800 kr för helåret', description: 'Försäkring', expected_template: 'Företagsförsäkring', expected_total: 4800 },
  { id: 'q3-02', quarter: 'Q3', month: 8, message: 'Faktura till Storföretag AB 90 000 kr för projektledning', description: 'Försäljning #4', expected_template: 'Försäljning tjänster 25%', expected_total: 112500 },
  { id: 'q3-04', quarter: 'Q3', month: 9, message: 'Friskvårdsbidrag gym 2 500 kr', description: 'Friskvård', expected_template: 'Friskvårdsbidrag', expected_total: 2500 },
  { id: 'q3-05', quarter: 'Q3', month: 9, message: 'Extern representation middag med kund 1 200 kr', description: 'Representation', expected_template: 'Extern representation mat', expected_total: 1200 },

  // Q4 (bokslut)
  { id: 'q4-01', quarter: 'Q4', month: 10, message: 'Faktura till Klient Beta 60 000 kr för underhåll', description: 'Försäljning #6', expected_template: 'Försäljning tjänster 25%', expected_total: 75000 },
  { id: 'q4-05', quarter: 'Q4', month: 12, message: 'Avskrivning datorer 5 000 kr för året', description: 'Avskrivning', expected_template: 'Avskrivning datorer', expected_total: 5000 },
  { id: 'q4-06', quarter: 'Q4', month: 12, message: 'Upplupna kostnader revision 15 000 kr', description: 'Upplupna kostnader', expected_template: 'Upplupna kostnader bokslut', expected_total: 15000 },
  { id: 'q4-07', quarter: 'Q4', month: 12, message: 'Avsättning periodiseringsfond 50 000 kr', description: 'Periodiseringsfond', expected_template: 'Avsättning periodiseringsfond', expected_total: 50000 },

  // Edge cases
  { id: 'edge-01', quarter: 'edge', month: 0, message: 'faktura 20 000', description: 'Utan "kr"', expected_template: 'Försäljning tjänster 25%', expected_total: 25000 },
  { id: 'edge-02', quarter: 'edge', month: 0, message: 'hyra', description: 'Saknar belopp', expected_template: '', expected_total: 0, expect_question: true },
];
