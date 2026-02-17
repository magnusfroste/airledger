
export interface DemoScenario {
  id: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'edge';
  month: number;
  message: string;
  description: string;
  expected_template: string;
  expected_total: number;
}

export interface QuarterSummary {
  quarter: string;
  label: string;
  description: string;
}

export const TESTBOLAGET_INFO = {
  name: 'Testbolaget AB',
  orgNr: '556123-4567',
  industry: 'IT-konsult',
  revenue: '1,2 MSEK',
  employees: 1,
  vatMethod: 'Faktureringsmetoden',
  fiscalYear: '2025-01-01 – 2025-12-31',
};

export const QUARTER_SUMMARIES: QuarterSummary[] = [
  { quarter: 'Q1', label: 'Q1 — Jan–Mar', description: 'Grundläggande drift: hyra, försäljning, löner' },
  { quarter: 'Q2', label: 'Q2 — Apr–Jun', description: 'Momsredovisning, investeringar, resor' },
  { quarter: 'Q3', label: 'Q3 — Jul–Sep', description: 'Försäkringar, förmåner, representation' },
  { quarter: 'Q4', label: 'Q4 — Okt–Dec', description: 'Bokslut: avskrivningar, periodiseringar, skatt' },
  { quarter: 'edge', label: 'Kantfall', description: 'Specialscenarier och felhantering' },
];

export const TESTBOLAGET_SCENARIOS: DemoScenario[] = [
  // ── Q1: Januari–Mars ──────────────────────────────
  {
    id: 'q1-01',
    quarter: 'Q1',
    month: 1,
    message: 'Betalt hyra för kontoret 12 500 kr',
    description: 'Kontorshyra januari',
    expected_template: 'Kontorslokal hyra med moms',
    expected_total: 12500,
  },
  {
    id: 'q1-02',
    quarter: 'Q1',
    month: 1,
    message: 'Faktura till Kund AB på 50 000 kr för konsulttjänster',
    description: 'Konsultfaktura – tjänsteförsäljning 25%',
    expected_template: 'Försäljning tjänster 25%',
    expected_total: 62500,
  },
  {
    id: 'q1-03',
    quarter: 'Q1',
    month: 1,
    message: 'Köpt kontorsmaterial för 625 kr',
    description: 'Kontorsmaterial (papper, pennor)',
    expected_template: 'Kontorsmaterial inköp',
    expected_total: 625,
  },
  {
    id: 'q1-04',
    quarter: 'Q1',
    month: 2,
    message: 'Mobilabonnemang 499 kr',
    description: 'Månadsavgift mobiltelefon',
    expected_template: 'Mobiltelefon abonnemang',
    expected_total: 499,
  },
  {
    id: 'q1-05',
    quarter: 'Q1',
    month: 2,
    message: 'Lön 35 000 kr brutto för januari',
    description: 'Löneutbetalning januari',
    expected_template: 'Lön utbetalning',
    expected_total: 35000,
  },
  {
    id: 'q1-06',
    quarter: 'Q1',
    month: 2,
    message: 'Arbetsgivaravgifter för januari 10 990 kr',
    description: 'Arbetsgivaravgifter (31.42%)',
    expected_template: 'Arbetsgivaravgifter',
    expected_total: 10990,
  },
  {
    id: 'q1-07',
    quarter: 'Q1',
    month: 2,
    message: 'Betalt F-skatt 10 000 kr',
    description: 'Preliminärskatt februari',
    expected_template: 'F-skatt inbetalning',
    expected_total: 10000,
  },
  {
    id: 'q1-08',
    quarter: 'Q1',
    month: 3,
    message: 'Kund AB har betalat fakturan på 62 500 kr',
    description: 'Kundbetalning inkommen',
    expected_template: 'Kundbetalning inkommande',
    expected_total: 62500,
  },

  // ── Q2: April–Juni ────────────────────────────────
  {
    id: 'q2-01',
    quarter: 'Q2',
    month: 4,
    message: 'Momsredovisning för Q1, ingående moms 3 375 kr, utgående moms 12 500 kr',
    description: 'Momsdeklaration kvartal 1',
    expected_template: 'Momsredovisning',
    expected_total: 9125,
  },
  {
    id: 'q2-02',
    quarter: 'Q2',
    month: 4,
    message: 'Faktura till Klient Beta 75 000 kr för systemutveckling',
    description: 'Konsultfaktura #2',
    expected_template: 'Försäljning tjänster 25%',
    expected_total: 93750,
  },
  {
    id: 'q2-03',
    quarter: 'Q2',
    month: 5,
    message: 'Faktura till Startup XYZ 40 000 kr för rådgivning',
    description: 'Konsultfaktura #3',
    expected_template: 'Försäljning tjänster 25%',
    expected_total: 50000,
  },
  {
    id: 'q2-04',
    quarter: 'Q2',
    month: 5,
    message: 'Köpt en ny laptop för 15 000 kr',
    description: 'Inventarieinköp – dator',
    expected_template: 'Inköp dator/laptop',
    expected_total: 15000,
  },
  {
    id: 'q2-05',
    quarter: 'Q2',
    month: 6,
    message: 'Tågbiljett Stockholm–Göteborg 1 200 kr tjänsteresa',
    description: 'Tjänsteresa tåg',
    expected_template: 'Tjänsteresa tåg/flyg',
    expected_total: 1200,
  },
  {
    id: 'q2-06',
    quarter: 'Q2',
    month: 6,
    message: 'Hotell övernattning i Göteborg 1 800 kr',
    description: 'Hotell tjänsteresa',
    expected_template: 'Hotell tjänsteresa',
    expected_total: 1800,
  },
  {
    id: 'q2-07',
    quarter: 'Q2',
    month: 6,
    message: 'Betalt hyra 12 500 kr för juni',
    description: 'Kontorshyra juni',
    expected_template: 'Kontorslokal hyra med moms',
    expected_total: 12500,
  },

  // ── Q3: Juli–September ────────────────────────────
  {
    id: 'q3-01',
    quarter: 'Q3',
    month: 7,
    message: 'Företagsförsäkring 4 800 kr för helåret',
    description: 'Företagsförsäkring (momsfri)',
    expected_template: 'Företagsförsäkring',
    expected_total: 4800,
  },
  {
    id: 'q3-02',
    quarter: 'Q3',
    month: 8,
    message: 'Faktura till Storföretag AB 90 000 kr för projektledning',
    description: 'Konsultfaktura #4 – stor',
    expected_template: 'Försäljning tjänster 25%',
    expected_total: 112500,
  },
  {
    id: 'q3-03',
    quarter: 'Q3',
    month: 8,
    message: 'Faktura till Nykund 30 000 kr för teknisk analys',
    description: 'Konsultfaktura #5',
    expected_template: 'Försäljning tjänster 25%',
    expected_total: 37500,
  },
  {
    id: 'q3-04',
    quarter: 'Q3',
    month: 9,
    message: 'Friskvårdsbidrag gym 2 500 kr',
    description: 'Friskvårdsförmån',
    expected_template: 'Friskvårdsbidrag',
    expected_total: 2500,
  },
  {
    id: 'q3-05',
    quarter: 'Q3',
    month: 9,
    message: 'Extern representation middag med kund 1 200 kr',
    description: 'Representation mat & dryck',
    expected_template: 'Extern representation mat',
    expected_total: 1200,
  },

  // ── Q4: Oktober–December (bokslut) ────────────────
  {
    id: 'q4-01',
    quarter: 'Q4',
    month: 10,
    message: 'Faktura till Klient Beta 60 000 kr för underhåll',
    description: 'Konsultfaktura #6',
    expected_template: 'Försäljning tjänster 25%',
    expected_total: 75000,
  },
  {
    id: 'q4-02',
    quarter: 'Q4',
    month: 10,
    message: 'Lön 35 000 kr brutto för september',
    description: 'Löneutbetalning',
    expected_template: 'Lön utbetalning',
    expected_total: 35000,
  },
  {
    id: 'q4-03',
    quarter: 'Q4',
    month: 11,
    message: 'Betalt hyra 12 500 kr för november',
    description: 'Kontorshyra november',
    expected_template: 'Kontorslokal hyra med moms',
    expected_total: 12500,
  },
  {
    id: 'q4-04',
    quarter: 'Q4',
    month: 11,
    message: 'Momsredovisning för Q3',
    description: 'Momsdeklaration kvartal 3',
    expected_template: 'Momsredovisning',
    expected_total: 0,
  },
  {
    id: 'q4-05',
    quarter: 'Q4',
    month: 12,
    message: 'Avskrivning datorer 5 000 kr för året',
    description: 'Årsavskrivning inventarier',
    expected_template: 'Avskrivning datorer',
    expected_total: 5000,
  },
  {
    id: 'q4-06',
    quarter: 'Q4',
    month: 12,
    message: 'Upplupna kostnader revision 15 000 kr',
    description: 'Bokslut – upplupna kostnader',
    expected_template: 'Upplupna kostnader bokslut',
    expected_total: 15000,
  },
  {
    id: 'q4-07',
    quarter: 'Q4',
    month: 12,
    message: 'Avsättning periodiseringsfond 50 000 kr',
    description: 'Periodiseringsfond bokslut',
    expected_template: 'Avsättning periodiseringsfond',
    expected_total: 50000,
  },
  {
    id: 'q4-08',
    quarter: 'Q4',
    month: 12,
    message: 'Skatteavsättning bolagsskatt beräknat resultat 200 000 kr',
    description: 'Bokslut – bolagsskatt 20.6%',
    expected_template: 'Skatteavsättning bolagsskatt',
    expected_total: 41200,
  },

  // ── Kantfall ──────────────────────────────────────
  {
    id: 'edge-01',
    quarter: 'edge',
    month: 0,
    message: 'faktura 20 000',
    description: 'Belopp utan "kr" – igenkänning',
    expected_template: 'Försäljning tjänster 25%',
    expected_total: 25000,
  },
  {
    id: 'edge-02',
    quarter: 'edge',
    month: 0,
    message: 'hyra',
    description: 'Saknar belopp – AI bör fråga',
    expected_template: '',
    expected_total: 0,
  },
  {
    id: 'edge-03',
    quarter: 'edge',
    month: 0,
    message: 'Köpt kaffe 45 kr',
    description: 'Litet belopp – representation eller material?',
    expected_template: 'Kontorsmaterial inköp',
    expected_total: 45,
  },
  {
    id: 'edge-04',
    quarter: 'edge',
    month: 0,
    message: 'Kreditfaktura till Kund AB -5 000 kr',
    description: 'Negativa belopp / kreditfaktura',
    expected_template: 'Kreditfaktura',
    expected_total: 5000,
  },
  {
    id: 'edge-05',
    quarter: 'edge',
    month: 0,
    message: 'Kundförlust Dålig Kund AB 25 000 kr',
    description: 'Kundförlust – ovanlig transaktion',
    expected_template: 'Kundförlust',
    expected_total: 25000,
  },
];

export const getScenariosByQuarter = (quarter: string): DemoScenario[] =>
  TESTBOLAGET_SCENARIOS.filter(s => s.quarter === quarter);

export const getQuarterLabel = (quarter: string): string => {
  const months: Record<string, string> = {
    Q1: 'Jan–Mar',
    Q2: 'Apr–Jun',
    Q3: 'Jul–Sep',
    Q4: 'Okt–Dec',
    edge: 'Kantfall',
  };
  return months[quarter] || quarter;
};
