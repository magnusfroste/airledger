
# Beslutsdagbok - AirLedger AI

## Arkitektoniska Beslut och Motiveringar

### ADR-001: Mallbaserat Bokföringssystem
**Datum**: 2025-01-17  
**Status**: Implementerat  
**Kontext**: Behov av konsistent och underhållbar bokföringslogik

#### Problem
- Hårdkodade kontonummer i AI-prompts och edge functions
- Svårt att uppdatera bokföringslogik utan kodändringar
- Inkonsistens mellan olika transaktionstyper
- Svår testning och validering av bokföringsregler

#### Beslut
Implementera "Single Source of Truth"-principen där alla konteringsförslag kommer från transaktionsmallar i databasen.

#### Konsekvenser
**Positiva**:
- Konsistent bokföring över tid
- Enkelt att lägga till nya transaktionstyper
- Testbar och verifierbar logik
- Användarna kan anpassa mallar
- Transparens i bokföringslogik

**Negativa**:
- Mer komplex initial setup
- Kräver mallunderhåll
- AI måste hantera mallsökning

#### Implementering
- Borttaget `save-invoice` och `save-payment` edge functions
- Uppdaterat system prompt att inte innehålla specifika kontonummer
- Skapat `use_transaction_template` som huvudfunktion
- Implementerat mallvalidering och statistik

---

### ADR-002: OpenAI Function Calling för AI-Integration
**Datum**: 2025-01-15  
**Status**: Implementerat  
**Kontext**: Behov av strukturerad AI-interaktion

#### Problem
- Ostrukturerade AI-svar svåra att parsa
- Svårt att säkerställa korrekt funktionsanrop
- Manuell parsing av AI-output felbenägen

#### Beslut
Använd OpenAI:s Function Calling API för all AI-backend-interaktion.

#### Konsekvenser
**Positiva**:
- Strukturerade och förutsägbara AI-svar
- Automatisk parameter-validering
- Type-safe function calls
- Enklare error handling

**Negativa**:
- Kopplat till OpenAI-ekosystemet
- Begränsat till OpenAI:s function calling capabilities

---

### ADR-003: Supabase Edge Functions för Backend
**Datum**: 2025-01-10  
**Status**: Implementerat  
**Kontext**: Val av backend-arkitektur

#### Problem
- Behov av skalbar serverless backend
- Krav på säker API-hantering
- Integration med PostgreSQL

#### Beslut
Använd Supabase Edge Functions för all backend-logik.

#### Konsekvenser
**Positiva**:
- Automatisk skalning
- Inbyggd PostgreSQL-integration
- Säker environment för secrets
- Snabb cold start

**Negativa**:
- Vendor lock-in till Supabase
- Begränsningar i runtime (Deno)

---

### ADR-004: Row Level Security (RLS) för Datasäkerhet
**Datum**: 2025-01-08  
**Status**: Implementerat  
**Kontext**: Datasäkerhet och multi-tenancy

#### Problem
- Flera användare ska dela samma databas
- Känslig finansiell data måste skyddas
- Behov av granulär åtkomstkontroll

#### Beslut
Implementera comprehensive RLS-policies för alla tabeller.

#### Konsekvenser
**Positiva**:
- Databas-level säkerhet
- Automatisk data-isolering
- Compliance-vänligt
- Svårt att göra säkerhetsmisstag

**Negativa**:
- Komplex policy-hantering
- Potential performance impact
- Debugging kan vara svårare

---

### ADR-005: React Query för State Management
**Datum**: 2025-01-05  
**Status**: Implementerat  
**Kontext**: Frontend state management

#### Problem
- Komplex server state synchronization
- Caching av API-anrop
- Loading states och error handling

#### Beslut
Använd React Query (@tanstack/react-query) för server state.

#### Konsekvenser
**Positiva**:
- Automatisk caching och invalidation
- Optimistic updates
- Background refetching
- Excellent DevTools

**Negativa**:
- Ytterligare dependencie
- Inlärningskurva för teamet

---

### ADR-006: Typescript Strict Mode
**Datum**: 2025-01-03  
**Status**: Implementerat  
**Kontext**: Type safety och code quality

#### Problem
- Runtime errors från type mismatches
- Oklar API contracts
- Svår refactoring

#### Beslut
Aktivera TypeScript strict mode för hela projektet.

#### Konsekvenser
**Positiva**:
- Färre runtime errors
- Bättre IDE support
- Self-documenting code
- Säkrare refactoring

**Negativa**:
- Mer initial arbete
- Striktare development process

---

## Tekniska Standarder

### TSD-001: Ingen Direct SQL i Edge Functions
**Datum**: 2025-01-17  
**Rationale**: Säkerhet och maintainability  
**Regel**: Använd alltid Supabase client methods, aldrig raw SQL

### TSD-002: Template-först Approach
**Datum**: 2025-01-17  
**Rationale**: Consistency och Single Source of Truth  
**Regel**: AI får aldrig föreslå specifika kontonummer, endast använda mallar

### TSD-003: Comprehensive Error Logging
**Datum**: 2025-01-15  
**Rationale**: Debugging och monitoring  
**Regel**: Alla edge functions ska ha strukturerad error logging

### TSD-004: Function Call Deduplication
**Datum**: 2025-01-14  
**Rationale**: Förhindra dublettransaktioner  
**Regel**: AI får endast göra EN function call per transaktion

---

## Förkastade Alternativ

### Alt-001: Direkta SQL-frågor för Bokföring
**Datum**: 2025-01-17  
**Status**: Förkastat  
**Anledning**: Säkerhetsrisk, svårt att underhålla, bryter abstraktioner

### Alt-002: Hårdkodad Bokföringslogik i AI Prompt
**Datum**: 2025-01-17  
**Status**: Förkastat  
**Anledning**: Omöjligt att underhålla, inkonsistent, ej testbart

### Alt-003: Separata Mikroservices
**Datum**: 2025-01-10  
**Status**: Förkastat  
**Anledning**: Onödig komplexitet för projektets storlek, högre maintenance overhead

### Alt-004: NoSQL Database
**Datum**: 2025-01-08  
**Status**: Förkastat  
**Anledning**: Bokföring kräver ACID-transaktioner och relational structure

---

## Framtida Överväganden

### FOV-001: Template Versioning
**Prioritet**: Medium  
**Beskrivning**: Hantera ändringar i mallar utan att påverka historiska transaktioner  
**Timeline**: Q2 2025

### FOV-002: Multi-language Support
**Prioritet**: Low  
**Beskrivning**: Support för andra språk än svenska  
**Timeline**: Q3 2025

### FOV-003: Advanced Analytics
**Prioritet**: High  
**Beskrivning**: AI-driven financial insights och recommendations  
**Timeline**: Q2 2025

### FOV-004: Integration APIs
**Prioritet**: Medium  
**Beskrivning**: API för tredjepartsintegrationer (banking, e-commerce)  
**Timeline**: Q3 2025

---

## Review Process

Denna beslutsdagbok granskas månadsvis av utvecklingsteamet för att:
- Validera att beslut följs korrekt
- Identifiera beslut som behöver revideras
- Dokumentera nya arkitektoniska beslut
- Uppdatera framtida överväganden

**Nästa review**: 2025-02-17  
**Ansvarig**: Lead Developer
