
# Situational Awareness for Air

## Problem
Air receives raw data lists (templates, transactions, balances) but lacks a high-level understanding of the user's situation. It doesn't know "this is a brand new company with nothing booked yet" versus "this is an active user mid-year." This means it can't reason like a bookkeeper -- it just pattern-matches words to intents.

## Solution: Add a Situation Summary layer

A new function `buildSituationSummary(userData)` in `_shared/context-builder.ts` that produces a concise, human-readable paragraph injected at the TOP of every AI prompt. This gives Air immediate awareness without extra AI calls.

### What the summary contains

```text
SITUATIONSANALYS:
- Bolagsform: Aktiebolag
- Antal ingående balanser: 0 (SAKNAS - nystartat eller ej konfigurerat)
- Antal bokförda transaktioner: 0 (TOMT)
- Kontosaldon: Inga
- Räkenskapsår startar: Januari
- Redovisningsmetod: Fakturering

BEDÖMNING: Användaren verkar vara ny och har inte konfigurerat sin bokföring.
Prioritera att hjälpa med ingående balanser innan transaktioner bokförs.
```

For an active user it would instead say:
```text
BEDÖMNING: Aktiv bokföring med 47 transaktioner.
Senaste bokning: 2026-02-18. Inga uppenbara luckor.
```

### Key situational signals

| Signal | Vad Air lär sig |
|---|---|
| 0 opening balances | "Fråga om IB innan vi börjar boka" |
| 0 transactions | "Ny användare -- guida steg för steg" |
| Company type = AB | "Aktiekapital 25000 kr krävs, motkonto 1930" |
| Fiscal year start | "Vet vilken period vi är i" |
| Has recent activity | "Erfaren -- var effektiv, inte pedagogisk" |

### Where it's injected

The situation summary is prepended to the bookkeeping context in `buildBookkeepingContext()`, so ALL agents (booking, advisory, reporting) automatically receive it. No changes needed per agent.

### Booking agent: smarter opening balance

Instead of the current brittle `handleOpeningBalance` with hardcoded counter-account logic and HTML markers, the booking agent delegates opening balance requests to the full AI call (like advisory does) -- but with the situation summary giving the AI enough context to:

1. Know account 2081 needs a counter-entry on 1930
2. Know the user is AB (so aktiekapital = 25000 is expected)
3. Resolve "aktiekapital" to account code 2081 via the chart of accounts in context

This removes the edge-case spaghetti and lets the AI reason naturally.

## Technical changes

| File | Change |
|---|---|
| `supabase/functions/_shared/context-builder.ts` | Add `buildSituationSummary(userData)` function. Call it at the top of `buildBookkeepingContext()`. |
| `supabase/functions/chat-assistant/agents/booking-agent.ts` | Simplify `handleOpeningBalance` -- remove HTML marker logic, use full AI call with function tools so the AI can reason about counter-accounts naturally. |
| `supabase/functions/chat-assistant/agents/prompts/booking.ts` | Add rules for opening balances: "IB for equity/liability accounts (class 2) always need a counter-entry. For AB, aktiekapital = 2081 with counter on 1930." |
| `supabase/functions/chat-assistant/system-prompt.ts` | Add a section about situational awareness: "Read the SITUATIONSANALYS at the top of context. Adapt your behavior accordingly." |
| Deploy `chat-assistant` | Redeploy after changes. |

## Expected behavior after fix

```text
User: "aktiekapital 25000"

Air (sees: AB, 0 IB, 0 transactions):
"Du registrerar aktiekapitalet for ditt aktiebolag. Jag foreslår:

- 2081 Aktiekapital: 25 000 kr (kredit)  
- 1930 Foretagskonto: 25 000 kr (debet)

Stammer det? Svara 'ja' for att spara bada."
```

No edge-case code needed -- the AI reasons from context.
