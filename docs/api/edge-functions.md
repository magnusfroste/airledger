
# Edge Functions API - AirLedger AI

## Översikt

AirLedger AI använder Supabase Edge Functions för all backend-logik. Denna dokumentation beskriver tillgängliga funktioner, deras parametrar och användning.

## Huvudfunktioner

### 1. Chat Assistant (`/chat-assistant`)

**Syfte**: Huvudfunktion för AI-interaktion och bokföringsoperationer

#### Request
```typescript
POST /functions/v1/chat-assistant
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "message": "Betalat hyra 8000 kr",
  "conversationId": "uuid-string",
  "imageUrl": "optional-receipt-url"
}
```

#### Response
```typescript
{
  "message": "Jag ser att detta passar mallen 'Lokalhyra'...",
  "conversationId": "uuid-string",
  "functionCalls": [
    {
      "function": "use_transaction_template",
      "parameters": {
        "templateName": "Lokalhyra",
        "amount": 8000,
        "description": "Hyra januari 2025"
      },
      "result": {
        "success": true,
        "transactionId": "uuid-string"
      }
    }
  ]
}
```

#### Error Response
```typescript
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### 2. Use Transaction Template (`/use-transaction-template`)

**Syfte**: Skapar transaktioner baserat på fördefinierade mallar

#### Request
```typescript
POST /functions/v1/use-transaction-template
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "templateName": "Lokalhyra",
  "amount": 8000,
  "description": "Hyra januari 2025",
  "transactionDate": "2025-01-01",
  "referenceNumber": "REF-001"
}
```

#### Response
```typescript
{
  "success": true,
  "transaction": {
    "id": "uuid-string",
    "total_amount": 8000,
    "entries": [
      {
        "account_code": "5010",
        "account_name": "Lokalhyror",
        "debit_amount": 8000,
        "credit_amount": 0
      },
      {
        "account_code": "1930", 
        "account_name": "Checkkonto",
        "debit_amount": 0,
        "credit_amount": 8000
      }
    ]
  },
  "template_used": "Lokalhyra",
  "message": "Transaktion skapad från mall 'Lokalhyra'"
}
```

### 3. Save General Transaction (`/save-general-transaction`)

**Syfte**: Skapar komplexa transaktioner utan mallar

#### Request
```typescript
POST /functions/v1/save-general-transaction
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "description": "Komplex transaktion",
  "entries": [
    {
      "accountCode": "1510",
      "accountName": "Kundfordringar",
      "debitAmount": 1250,
      "description": "Kundfordran"
    },
    {
      "accountCode": "3001",
      "accountName": "Försäljning",
      "creditAmount": 1000,
      "description": "Försäljning"
    },
    {
      "accountCode": "2610",
      "accountName": "Utgående moms",
      "creditAmount": 250,
      "description": "Moms 25%"
    }
  ],
  "transactionDate": "2025-01-01",
  "referenceNumber": "INV-001"
}
```

### 4. Save Opening Balance (`/save-opening-balance`)

**Syfte**: Registrerar ingående balanser

#### Request
```typescript
POST /functions/v1/save-opening-balance
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "accountCode": "1930",
  "accountName": "Checkkonto", 
  "amount": 50000
}
```

### 5. Validate Templates (`/validate-templates`)

**Syfte**: Validerar transaktionsmallar (endast för utvecklare)

#### Request
```typescript
POST /functions/v1/validate-templates
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "templateIds": ["uuid1", "uuid2"] // Valfritt, validerar alla om tomt
}
```

#### Response
```typescript
{
  "validation_results": [
    {
      "template_id": "uuid-string",
      "template_name": "Lokalhyra",
      "status": "ok|warning|error",
      "issues": [],
      "warnings": ["Potential issue..."],
      "suggestions": ["AI suggestion..."]
    }
  ],
  "summary": {
    "total": 10,
    "errors": 0,
    "warnings": 2,
    "ok": 8
  }
}
```

## Autentisering

Alla funktioner kräver JWT-token från Supabase Auth:

```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

const response = await fetch('/functions/v1/function-name', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
```

## Felhantering

### Vanliga Fehkoder

| Kod | Beskrivning | Åtgärd |
|-----|-------------|---------|
| `UNAUTHORIZED` | Ogiltig eller saknad token | Kontrollera autentisering |
| `TEMPLATE_NOT_FOUND` | Mall finns inte | Verifiera mallnamn |
| `VALIDATION_ERROR` | Ogiltig data | Kontrollera request-format |
| `INSUFFICIENT_QUOTA` | Kvot överskriden | Uppgradera abonnemang |
| `INTERNAL_ERROR` | Serverfel | Kontakta support |

### Error Response Format

```typescript
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error",
    "suggestion": "How to fix"
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

## Rate Limiting

| Function | Limit | Window |
|----------|-------|---------|
| `chat-assistant` | 30 requests | per minut |
| `use-transaction-template` | 100 requests | per minut |
| `save-general-transaction` | 50 requests | per minut |
| `validate-templates` | 10 requests | per minut |

## Övervakning och Logging

### Tillgängliga Logs
- Request/Response logs
- Error logs med stack traces
- Performance metrics
- Template usage statistics

### Log Access
```bash
# Supabase CLI
supabase functions logs chat-assistant

# Dashboard
https://supabase.com/dashboard/project/{project_id}/functions/chat-assistant/logs
```

## Exempel på Användning

### Komplett Chat Flow

```typescript
// 1. Skicka meddelande till AI
const chatResponse = await supabase.functions.invoke('chat-assistant', {
  body: {
    message: "Betalat el 1250 kr inklusive moms",
    conversationId: currentConversationId
  }
})

// 2. AI returnerar function call som ska utföras
// (Detta sker automatiskt i chat-assistant)

// 3. Resultat visas för användaren
if (chatResponse.data?.functionCalls) {
  console.log('Transaktioner skapade:', chatResponse.data.functionCalls)
}
```

### Direkt Template Usage

```typescript
// Skapa transaktion direkt med mall
const templateResponse = await supabase.functions.invoke('use-transaction-template', {
  body: {
    templateName: 'Försäljning 25% moms',
    amount: 1250,
    description: 'Försäljning till Kund AB'
  }
})

if (templateResponse.data?.success) {
  console.log('Transaktion skapad:', templateResponse.data.transaction)
}
```

Denna API-dokumentation ger utvecklare all information som behövs för att integrera med AirLedger AI:s backend-funktioner.
