import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error('Image data is required');

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('AI API key not configured');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Classify this document image. Reply with ONLY one JSON object:
{"type": "receipt" | "invoice" | "bank_statement" | "unknown", "confidence": 0-100}

Rules:
- "receipt": A single purchase receipt (kvitto), typically from a store or restaurant
- "invoice": A single invoice (faktura) requesting payment
- "bank_statement": A bank account statement (kontoutdrag/bankutdrag) showing MULTIPLE transactions in a list/table format
- "unknown": Cannot determine

Look for these clues:
- Bank statements have columns like Date, Description, Amount and show many rows of transactions
- Receipts show a single purchase with itemized lines from one store
- Invoices have payment details, due dates, bankgiro/OCR numbers

Reply ONLY with the JSON, no other text.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Classify this document:' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error('AI classification failed');
    }

    const result = await response.json();
    let raw = result.choices?.[0]?.message?.content || '{}';
    
    // Clean markdown
    if (raw.includes('```')) {
      raw = raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    }

    const classification = JSON.parse(raw);

    return new Response(
      JSON.stringify({ success: true, ...classification }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Classification error:', error);
    return new Response(
      JSON.stringify({ success: false, type: 'unknown', confidence: 0, error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
