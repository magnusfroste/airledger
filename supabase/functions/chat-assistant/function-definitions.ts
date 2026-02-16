

export const FUNCTION_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "use_transaction_template",
      description: "PRIORITERA DENNA FUNKTION! Använd för vanliga återkommande transaktioner som hyra, el, telefon, försäkringar, löner, bankavgifter, etc. VIKTIGT: Visa ALLTID mallens exakta bokföringsposter för användaren INNAN du anropar denna funktion. Exempel på presentation: 'Enligt mallen Lokalhyra blir posterna: Debet 5010 Lokalhyror 8000 kr, Kredit 1930 Checkkonto 8000 kr. Bokför jag denna transaktion?'",
      parameters: {
        type: "object",
        properties: {
          templateName: {
            type: "string",
            description: "Namnet på mallen att använda (t.ex. 'Lokalhyra', 'Telekommunikation', 'Försäkringar'). MÅSTE matcha en befintlig mall från användarens tillgängliga mallar."
          },
          amount: {
            type: "number",
            description: "Beloppet för transaktionen. Använd det exakta belopp som användaren anger."
          },
          description: {
            type: "string", 
            description: "Specifik beskrivning för denna transaktion (valfritt, ex: 'Hyra januari 2025')"
          },
          transactionDate: {
            type: "string",
            description: "Transaktionsdatum i format YYYY-MM-DD (valfritt, använder dagens datum som standard)"
          },
          referenceNumber: {
            type: "string",
            description: "Referensnummer eller fakturanummer (valfritt)"
          }
        },
        required: ["templateName", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_opening_balance",
      description: "ANVÄND DENNA NÄR: Användaren nämner 'ingående balans', 'saldo på konto', 'startbalans' eller liknande. EXEMPEL: 'Jag har 50 000 kr på checkkontot som ingående balans'",
      parameters: {
        type: "object",
        properties: {
          accountCode: {
            type: "string",
            description: "Kontonummer enligt BAS-kontoplanen (ex: 1930, 2640)"
          },
          accountName: {
            type: "string", 
            description: "Kontonamn (ex: Checkkonto, Leverantörsskulder)"
          },
          amount: {
            type: "number",
            description: "Belopp för ingående balans"
          }
        },
        required: ["accountCode", "accountName", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_general_transaction",
      description: "ANVÄND ENDAST NÄR: Ingen mall passar eller för komplexa transaktioner som kräver flera konton. EXEMPEL: Ovanliga transaktioner, investeringar, lån, eller specifika bokföringsposter som inte täcks av mallar. VIKTIGT: Visa alltid de exakta posterna för användaren innan bokföring.",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Beskrivning av transaktionen"
          },
          entries: {
            type: "array",
            description: "Array av bokföringsposter",
            items: {
              type: "object",
              properties: {
                accountCode: {
                  type: "string",
                  description: "Kontonummer enligt BAS-kontoplanen"
                },
                accountName: {
                  type: "string",
                  description: "Kontonamn"
                },
                debitAmount: {
                  type: "number",
                  description: "Debitbelopp (lämna tom för kredit)"
                },
                creditAmount: {
                  type: "number", 
                  description: "Kreditbelopp (lämna tom för debit)"
                },
                description: {
                  type: "string",
                  description: "Beskrivning för denna post (valfritt)"
                }
              },
              required: ["accountCode", "accountName"]
            }
          },
          transactionDate: {
            type: "string",
            description: "Transaktionsdatum i format YYYY-MM-DD (valfritt, använder dagens datum som standard)"
          },
          referenceNumber: {
            type: "string",
            description: "Referensnummer eller fakturanummer (valfritt)"
          }
        },
        required: ["description", "entries"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_vat_report",
      description: "Beräkna momsrapport för en given period. Returnerar utgående moms, ingående moms och nettomoms att betala/få tillbaka. Använd när användaren frågar om moms, momsdeklaration eller momsrapport.",
      parameters: {
        type: "object",
        properties: {
          periodStart: {
            type: "string",
            description: "Periodens startdatum i format YYYY-MM-DD"
          },
          periodEnd: {
            type: "string",
            description: "Periodens slutdatum i format YYYY-MM-DD"
          }
        },
        required: ["periodStart", "periodEnd"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_account_balance",
      description: "Beräkna saldo för ett specifikt konto under en given period. Visar IB, rörelse (debet/kredit) och UB. Använd för avstämning, kontosaldo eller periodavstämning.",
      parameters: {
        type: "object",
        properties: {
          accountCode: {
            type: "string",
            description: "Kontonummer enligt BAS-kontoplanen (ex: 1930, 2640)"
          },
          periodStart: {
            type: "string",
            description: "Periodens startdatum i format YYYY-MM-DD (valfritt, standard är räkenskapsårets start)"
          },
          periodEnd: {
            type: "string",
            description: "Periodens slutdatum i format YYYY-MM-DD (valfritt, standard är dagens datum)"
          }
        },
        required: ["accountCode"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_year_end_checklist",
      description: "Hämta checklista och status för årsbokslut. Visar vilka steg som är gjorda och vad som återstår. Använd när användaren frågar om bokslut, årsbokslut eller vill stänga året.",
      parameters: {
        type: "object",
        properties: {
          fiscalYear: {
            type: "number",
            description: "Räkenskapsåret att göra bokslut för (ex: 2025)"
          }
        },
        required: ["fiscalYear"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_year_end_summary",
      description: "Generera en komplett bokslutssammanfattning med resultaträkning och balansräkning. Visar intäkter, kostnader, årets resultat, tillgångar, skulder och eget kapital. Kontrollerar att balansen stämmer. Använd efter att alla bokslutssteg är genomförda.",
      parameters: {
        type: "object",
        properties: {
          fiscalYear: {
            type: "number",
            description: "Räkenskapsåret att sammanfatta (ex: 2025)"
          }
        },
        required: ["fiscalYear"]
      }
    }
  }
];

