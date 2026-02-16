

# Bankutdragsgranskning inline i chatten

## Problem

Granskningskortet for bankutdrag renderas utanfor meddelandelistan (under MessageList i ChatInterface), vilket gor det otydligt och "Bokfor"-knappen fungerar inte som forvantat. Anvandaren ser kortet avskilt fran konversationen.

## Losning

Flytta granskningskortet sa det visas som ett meddelande i chatfloden. Nar AI:n analyserat ett bankutdrag laggs ett speciellt meddelande till i chatten som innehaller analysdata. Message-komponenten renderar BankStatementReview inline for det meddelandet.

## Andringar

### 1. Utoka Message-typen (`src/hooks/useMessages.ts`)
- Lagg till `'bank_review'` som giltig `type`
- Lagg till optional `bankAnalysis` property pa Message-interfacet

### 2. Uppdatera `useBankStatementAnalysis.ts`
- Nar analysen lyckas: skapa ett meddelande med `type: 'bank_review'` och bifoga `bankAnalysis`-data direkt i meddelandet
- Ta bort separat `isBankReviewVisible` / `bankAnalysis` state -- all data lever i meddelandet
- Flytta `saveBatchTransactions` och `dismissBankReview` sa de arbetar mot meddelandestate istallet

### 3. Uppdatera `Message.tsx`
- Importera BankStatementReview
- Nar `type === 'bank_review'` och `bankAnalysis` finns: rendera BankStatementReview inline istallet for vanlig markdown
- Skicka callbacks for `onConfirmSelected` och `onDismiss` via props

### 4. Uppdatera `MessageList.tsx`
- Lagg till `bankAnalysis` i MessageType-interfacet
- Skicka ned callbacks for bankutdragsbokning: `onBankConfirm` och `onBankDismiss`
- Vidarebefordra dessa till Message-komponenten

### 5. Uppdatera `ChatInterface.tsx`
- Ta bort det separata `BankStatementReview`-blocket (rad 438-452)
- Ta bort import av BankStatementReview
- Skicka `onBankConfirm` och `onBankDismiss` callbacks till MessageList
- Nar bokning ar klar eller avbruten: uppdatera meddelandets state (t.ex. markera som "bokfort" eller ta bort analysen)

### 6. Forbattra `BankStatementReview.tsx`
- Lagg till instruktionstext overst: "Avmarkera rader du inte vill bokfora"
- Visa progress under bokning: "Bokfor 3 av 7..."
- Markera rader som misslyckats i rott med felmeddelande
- Gor "Bokfor"-knappen tydligare med storre storlek

## Teknisk filmatris

| Fil | Andring |
|-----|---------|
| `src/hooks/useMessages.ts` | Utoka Message-typ med `bankAnalysis?` och `'bank_review'` |
| `src/hooks/useBankStatementAnalysis.ts` | Returnera meddelande med analysdata, ta bort separat UI-state |
| `src/components/chat/Message.tsx` | Rendera BankStatementReview inline for `bank_review`-typ |
| `src/components/chat/MessageList.tsx` | Ny prop: `onBankConfirm`, `onBankDismiss`, skicka vidare till Message |
| `src/components/ChatInterface.tsx` | Ta bort separat review-block, koppla callbacks via MessageList |
| `src/components/chat/BankStatementReview.tsx` | Progress-feedback, instruktionstext, felmarkering per rad |

