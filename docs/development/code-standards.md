
# Kodstandarder - AirLedger AI

## Allmänna Principer

### 1. Enkelhet först
- Skriv kod som är lätt att förstå
- Undvik överkomplex abstraktioner
- Kommentera komplexe logik
- Prioritera läsbarhet över "smart" kod

### 2. Konsistens
- Följ etablerade mönster i projektet
- Använd samma namnkonventioner
- Behåll liknande filstruktur
- Följ team-beslutade konventioner

### 3. Säkerhet
- Validera all användarinput
- Använd proper autentisering
- Låt aldrig känslig data läcka
- Följ OWASP-riktlinjer

## TypeScript Standards

### Typdefinitioner
```typescript
// ✅ Bra: Explicit och tydlig
interface TransactionTemplate {
  id: string
  template_name: string
  description: string
  template_entries: TemplateEntry[]
  is_system_template: boolean
}

// ❌ Undvik: any typer
const data: any = getData()

// ✅ Bra: Proper generics
const response: ApiResponse<Transaction> = await api.getTransaction()
```

### Namnkonventioner
```typescript
// Interfaces och Types - PascalCase
interface UserProfile {}
type TransactionType = 'income' | 'expense'

// Variabler och funktioner - camelCase
const userName = 'john'
const calculateTotal = () => {}

// Konstanter - SCREAMING_SNAKE_CASE
const MAX_RETRIES = 3
const API_ENDPOINTS = {
  CHAT: '/chat-assistant'
}

// Komponenter - PascalCase
const ChatInterface = () => {}
```

### Error Handling
```typescript
// ✅ Bra: Explicit error handling
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error('User-friendly message')
}

// ✅ Bra: Type-safe error handling
const result = await safeOperation()
if (result.error) {
  handleError(result.error)
  return
}
```

## React Standards

### Komponentstruktur
```typescript
// ✅ Bra: Tydlig komponentstruktur
interface ChatMessageProps {
  message: string
  sender: 'user' | 'ai'
  timestamp: Date
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  sender, 
  timestamp 
}) => {
  // Lokalt state
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [])
  
  // Event handlers
  const handleClick = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])
  
  // Render
  return (
    <div className={`message ${sender}`}>
      {/* JSX content */}
    </div>
  )
}
```

### Hooks Usage
```typescript
// ✅ Bra: Custom hooks för återanvändbar logik
const useTransactionTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchTemplates()
  }, [])
  
  return { templates, loading, refetch: fetchTemplates }
}

// ✅ Bra: Proper dependency arrays
useEffect(() => {
  fetchData(userId)
}, [userId]) // Include all dependencies
```

### State Management
```typescript
// ✅ Bra: Lokalt state för komponentspecifik data
const [isOpen, setIsOpen] = useState(false)

// ✅ Bra: Context för delade states
const { user, login, logout } = useAuth()

// ✅ Bra: React Query för server state
const { data: transactions, isLoading } = useQuery({
  queryKey: ['transactions'],
  queryFn: fetchTransactions
})
```

## Supabase/Backend Standards

### Edge Functions
```typescript
// ✅ Bra: Proper error handling och CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Input validation
    const { message } = await req.json()
    if (!message?.trim()) {
      throw new Error('Message is required')
    }

    // Business logic
    const result = await processMessage(message)
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}
```

### Databas Queries
```typescript
// ✅ Bra: Type-safe queries
const { data: templates, error } = await supabase
  .from('airledger_transaction_templates')
  .select('*')
  .eq('is_system_template', true)

if (error) {
  throw new Error(`Failed to fetch templates: ${error.message}`)
}

// ✅ Bra: Proper RLS policies används
// Ingen direkta SQL-frågor, använd client methods
```

## CSS/Styling Standards

### Tailwind Usage
```typescript
// ✅ Bra: Semantiska klasser, conditional styling
const buttonClasses = cn(
  "px-4 py-2 rounded-lg font-medium transition-colors",
  {
    "bg-primary text-primary-foreground hover:bg-primary/90": variant === 'primary',
    "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === 'secondary',
    "opacity-50 cursor-not-allowed": disabled
  }
)

// ✅ Bra: Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

### Design System
```typescript
// ✅ Bra: Använd design tokens
const theme = {
  colors: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
  }
}
```

## Testing Standards

### Unit Tests
```typescript
// ✅ Bra: Tydliga test descriptions
describe('ChatMessage Component', () => {
  it('should render user message correctly', () => {
    render(
      <ChatMessage 
        message="Hello" 
        sender="user" 
        timestamp={new Date()} 
      />
    )
    
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByTestId('user-message')).toHaveClass('message user')
  })

  it('should handle click events', async () => {
    const user = userEvent.setup()
    render(<ChatMessage {...defaultProps} />)
    
    await user.click(screen.getByRole('button'))
    
    expect(mockCallback).toHaveBeenCalledWith(expectedArgs)
  })
})
```

### Integration Tests
```typescript
// ✅ Bra: Test hela flöden
describe('Transaction Creation Flow', () => {
  it('should create transaction from template', async () => {
    // Setup
    const mockTemplate = createMockTemplate()
    server.use(
      rest.post('/functions/v1/use-transaction-template', (req, res, ctx) => {
        return res(ctx.json({ success: true }))
      })
    )

    // Action
    await createTransactionFromTemplate(mockTemplate, 1000)

    // Assert
    expect(mockApiCall).toHaveBeenCalledWith(expectedPayload)
  })
})
```

## Säkerhetsriktlinjer

### Input Validation
```typescript
// ✅ Bra: Validera all input
const validateTransactionInput = (input: unknown): TransactionInput => {
  const schema = z.object({
    amount: z.number().positive(),
    description: z.string().min(1).max(500),
    date: z.string().datetime()
  })
  
  return schema.parse(input)
}
```

### Sensitive Data
```typescript
// ✅ Bra: Aldrig logga känslig data
console.log('Processing transaction', { 
  id: transaction.id,
  amount: transaction.amount 
  // Aldrig: userId, email, kontonummer etc.
})

// ✅ Bra: Använd environment variables
const openaiKey = Deno.env.get('OPENAI_API_KEY')
if (!openaiKey) {
  throw new Error('OPENAI_API_KEY is required')
}
```

## Prestandariktlinjer

### React Performance
```typescript
// ✅ Bra: Memoization för dyra beräkningar
const expensiveValue = useMemo(() => {
  return heavyCalculation(data)
}, [data])

// ✅ Bra: Callback memoization
const handleClick = useCallback((id: string) => {
  onItemClick(id)
}, [onItemClick])

// ✅ Bra: Lazy loading
const HeavyComponent = lazy(() => import('./HeavyComponent'))
```

### Bundle Optimization
```typescript
// ✅ Bra: Tree-shakable imports
import { format } from 'date-fns'

// ❌ Undvik: Hela bibliotek
import * as dateFns from 'date-fns'
```

## Code Review Checklist

### Innan PR
- [ ] Alla tester går igenom
- [ ] Lint/format utan fel
- [ ] Type checking utan fel
- [ ] Manuell testning utförd
- [ ] Performance impact analyserad

### Code Review Focus
- [ ] Kodkvalitet och läsbarhet
- [ ] Säkerhetsaspekter
- [ ] Performance implications
- [ ] Testbeläggning
- [ ] Dokumentation uppdaterad

## Filstruktur

### Komponentorganisation
```
src/components/
├── ui/                 # Återanvändbara UI-komponenter
├── chat/              # Chat-specifika komponenter
├── dashboard/         # Dashboard-komponenter
└── forms/             # Formulärkomponenter
```

### Hooks Organisation
```
src/hooks/
├── useAuth.ts         # Autentisering
├── useTransactions.ts # Transaction-logik
└── useTemplates.ts    # Template-hantering
```

Genom att följa dessa standarder säkerställer vi hög kodkvalitet, underhållbarhet och team-produktivitet i AirLedger AI-projektet.
