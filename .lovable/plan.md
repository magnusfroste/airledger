

# Fix: "Bokför utgift" ska fråga användaren vad som ska bokföras

## Problem
När användaren trycker "Bokför utgift" skickas meddelandet "Jag vill bokföra en utgift" till chat-assistant. Intent-klassificeraren returnerar `book_expense` men utan belopp, leverantör eller beskrivning. Koden försöker då matcha en mall (misslyckas utan data) och faller igenom till freeform AI-bokföring som inte heller har tillräcklig information -- resultatet blir ett tomt eller förvirrande svar.

## Orsak
I `chat-assistant/index.ts` (rad 146-167) kontrolleras bara `clarification_needed && !amount`, men intent-klassificeraren ställer `clarification_needed` till momsfrågan, inte till den grundläggande frågan "vad vill du bokföra?". Det saknas en kontroll för när **all data saknas**.

## Lösning
Lägg till en tidig kontroll i `book_expense/book_sale/book_payment`-grenen: om varken belopp, leverantör eller beskrivning finns, returnera en tydlig fråga som guidar användaren att antingen beskriva utgiften eller bifoga ett kvitto/faktura.

## Teknisk plan

### 1. Uppdatera `supabase/functions/chat-assistant/index.ts`
I `book_expense/book_sale/book_payment`-casen, lägg till kontroll **före** mallmatchning:

```text
case 'book_expense':
case 'book_sale':
case 'book_payment': {
  const d = intent.extracted_data;
  const hasEnoughData = d.amount || d.vendor || d.description;

  if (!hasEnoughData) {
    // Användaren har bara sagt "bokför en utgift" utan detaljer
    const typeLabel = intent.intent === 'book_sale' ? 'intäkt' : 
                      intent.intent === 'book_payment' ? 'betalning' : 'utgift';
    aiResponse = `Självklart! Jag hjälper dig bokföra en ${typeLabel}. Du kan:\n\n` +
      `- **Beskriv transaktionen** — t.ex. "Köpt kontorsmaterial för 500 kr"\n` +
      `- **Bifoga ett kvitto eller faktura** — så analyserar jag det automatiskt\n\n` +
      `Vad vill du bokföra?`;
    break;
  }

  // Befintlig logik: mallmatchning, clarification, freeform...
}
```

### 2. Uppdatera `supabase/functions/chat-assistant/response-formatter.ts`
Lägg till en ny formatteringsfunktion (valfritt, för konsekvens):

```typescript
export function formatMissingDataPrompt(transactionType: string): string {
  const typeLabel = transactionType === 'book_sale' ? 'intäkt' : 
                    transactionType === 'book_payment' ? 'betalning' : 'utgift';
  return `Självklart! Jag hjälper dig bokföra en ${typeLabel}. Du kan:\n\n` +
    `- **Beskriv transaktionen** — t.ex. "Köpt kontorsmaterial för 500 kr"\n` +
    `- **Bifoga ett kvitto eller faktura** — så analyserar jag det automatiskt\n\n` +
    `Vad vill du bokföra?`;
}
```

## Filer som ändras
- `supabase/functions/chat-assistant/index.ts` -- tidig kontroll för saknad data
- `supabase/functions/chat-assistant/response-formatter.ts` -- ny formatteringsfunktion

## Resultat
- "Bokför utgift"-knappen ger nu ett tydligt svar som guidar användaren
- Användaren förstår att hen kan beskriva transaktionen i text eller bifoga bild
- Ingen breaking change -- befintlig logik för när data finns kvar oförändrad

