import { IntentClassification } from './types.ts';

const INTENT_SYSTEM_PROMPT = `Du är en svensk bokföringsassistent. Klassificera användarens avsikt och extrahera relevant data.

Returnera ALLTID JSON med följande struktur:
{
  "intent": "book_expense" | "book_sale" | "book_payment" | "opening_balance" | "confirm_booking" | "ask_question" | "view_report" | "analyze_image" | "unknown",
  "extracted_data": {
    "amount": number | null,
    "date": "YYYY-MM-DD" | null,
    "description": string | null,
    "vendor": string | null,
    "vat_rate": number | null,
    "reference": string | null,
    "payment_method": string | null
  },
  "matched_template_hint": string | null,
  "confidence": number (0-1),
  "clarification_needed": string | null
}

REGLER:
- "book_expense": Köp, faktura från leverantör, betalat räkning, hyra, el, telefon
- "book_sale": Fakturerat kund, sålt, intäkt, skickat faktura
- "book_payment": Fått betalning, kund betalar, kontant betalning
- "opening_balance": Ingående balans, startsaldo, saldo på konto
- "confirm_booking": "ja", "ok", "bokför", "stämmer", bekräftande svar
- "ask_question": Frågor om bokföring, regler, konton
- "view_report": Rapport, resultat, balansräkning, översikt
- "analyze_image": Nämner bild, kvitto, foto (men hanteras separat)
- "unknown": Oklart eller orelaterat

Om beloppet anges utan moms-specifikation, sätt clarification_needed till "Är beloppet inkl eller exkl moms?"
Om datum saknas, sätt date till null (systemet använder dagens datum).
matched_template_hint: gissa mallnamn baserat på beskrivning (t.ex. "Lokalhyra", "Telekommunikation").
Dagens datum: ${new Date().toISOString().split('T')[0]}`;

export async function classifyIntent(
  message: string,
  templateNames: string[],
  apiKey: string
): Promise<IntentClassification> {
  const userPrompt = `Tillgängliga mallar: ${templateNames.join(', ')}

Meddelande: "${message}"`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: INTENT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_intent',
              description: 'Classify user intent and extract data',
              parameters: {
                type: 'object',
                properties: {
                  intent: {
                    type: 'string',
                    enum: ['book_expense', 'book_sale', 'book_payment', 'opening_balance', 'confirm_booking', 'ask_question', 'view_report', 'analyze_image', 'unknown']
                  },
                  extracted_data: {
                    type: 'object',
                    properties: {
                      amount: { type: 'number' },
                      date: { type: 'string' },
                      description: { type: 'string' },
                      vendor: { type: 'string' },
                      vat_rate: { type: 'number' },
                      reference: { type: 'string' },
                      payment_method: { type: 'string' }
                    }
                  },
                  matched_template_hint: { type: 'string' },
                  confidence: { type: 'number' },
                  clarification_needed: { type: 'string' }
                },
                required: ['intent', 'extracted_data', 'confidence'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'classify_intent' } }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Intent classifier error:', response.status, errText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return {
        intent: parsed.intent || 'unknown',
        extracted_data: parsed.extracted_data || {},
        matched_template_hint: parsed.matched_template_hint || null,
        confidence: parsed.confidence || 0,
        clarification_needed: parsed.clarification_needed || null,
      };
    }

    // Fallback: try parsing content as JSON
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return parsed as IntentClassification;
      } catch {
        // Not JSON, treat as unknown
      }
    }

    return {
      intent: 'unknown',
      extracted_data: {},
      confidence: 0,
      clarification_needed: null,
    };
  } catch (error) {
    console.error('Intent classification failed:', error);
    return {
      intent: 'unknown',
      extracted_data: {},
      confidence: 0,
      clarification_needed: null,
    };
  }
}
