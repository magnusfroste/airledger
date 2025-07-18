
export const FUNCTION_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "use_transaction_template",
      description: "PRIORITERA DENNA FUNKTION! Använd för vanliga återkommande transaktioner som hyra, el, telefon, försäkringar, löner, bankavgifter, etc. EXEMPEL: 'Betalat hyra 8000 kr', 'Bredband Telia 450 kr', 'Försäkring 1200 kr', 'Lön 35000 kr'. Kolla ALLTID först om det finns en passande mall!",
      parameters: {
        type: "object",
        properties: {
          templateName: {
            type: "string",
            description: "Namnet på mallen att använda (t.ex. 'Lokalhyra', 'Telekommunikation', 'Försäkringar')"
          },
          amount: {
            type: "number",
            description: "Beloppet för transaktionen"
          },
          description: {
            type: "string", 
            description: "Specifik beskrivning för denna transaktion (valfritt)"
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
      name: "save_invoice",
      description: "ANVÄND DENNA NÄR: Användaren säger 'jag har fakturerat', 'skickat faktura', 'fakturerat X'. EXEMPEL: 'Jag har fakturerat Acme AB 10 000 kr för konsultuppdrag'",
      parameters: {
        type: "object",
        properties: {
          customerName: {
            type: "string",
            description: "Kundens namn eller företag"
          },
          amount: {
            type: "number",
            description: "Fakturabelopp i kronor"
          },
          description: {
            type: "string",
            description: "Beskrivning av vara/tjänst som fakturerats"
          },
          invoiceNumber: {
            type: "string",
            description: "Fakturanummer (valfritt)"
          },
          dueDate: {
            type: "string",
            description: "Förfallodatum i format YYYY-MM-DD (valfritt)"
          },
          transactionDate: {
            type: "string",
            description: "Fakturadatum i format YYYY-MM-DD (valfritt, använder dagens datum som standard)"
          }
        },
        required: ["customerName", "amount", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_payment",
      description: "ANVÄND DENNA NÄR: Användaren säger 'fått betalning', 'X har betalat', 'inbetalning från kund'. EXEMPEL: 'Acme AB har betalat 12 500 kr'",
      parameters: {
        type: "object",
        properties: {
          customerName: {
            type: "string",
            description: "Kundens namn eller företag som har betalat"
          },
          amount: {
            type: "number",
            description: "Betalningsbelopp i kronor"
          },
          description: {
            type: "string",
            description: "Beskrivning av betalningen (t.ex. 'Betalning från X')"
          },
          transactionDate: {
            type: "string",
            description: "Betalningsdatum i format YYYY-MM-DD (valfritt, använder dagens datum som standard)"
          }
        },
        required: ["customerName", "amount", "description"]
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
            description: "Kontonummer enligt BAS 2024 (ex: 1930, 2640)"
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
      description: "ANVÄND ENDAST NÄR: Ingen mall passar eller för komplexa transaktioner som kräver flera konton. EXEMPEL: Ovanliga transaktioner, investeringar, lån, eller specifika bokföringsposter som inte täcks av mallar.",
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
                  description: "Kontonummer enligt BAS 2024"
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
  }
];
