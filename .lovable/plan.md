

# Action Buttons: Bokfor och Avbryt

Minimal implementation -- tva knappar under bokforingsforslag som skickar text till chatten, precis som om anvandaren skrivit det.

---

## Approach

Knapparna ar inte "riktiga" knappar med egen logik. De triggar exakt samma flode som att skriva "Ja, bokfor" eller "Avbryt" i chatten. Detta bevarar Intent Router-arkitekturen och gor knapparna till ren UX-socker.

### Detektering

Ett AI-meddelande ar ett bokforingsforslag om det innehaller bade "Bokforingsforslag" och "Ska jag bokfora detta?". Enkel string-match -- ingen ny metadata behovs.

---

## Filandringar

### 1. `src/components/chat/ActionButtons.tsx` (ny fil)

Liten komponent som renderar tva knappar:
- **Bokfor** (primar, gron) -- skickar "Ja, bokfor detta"
- **Avbryt** (ghost, diskret) -- skickar "Nej, avbryt"

Props: `onAction: (message: string) => void`

Styling: subtila, rundade knappar med liten storlek. Placerade under meddelandebubblan, vansterjusterade (som AI-meddelandet).

### 2. `src/components/chat/Message.tsx`

- Importera `ActionButtons`
- Lagg till ny prop: `onAction?: (message: string) => void`
- Efter meddelandebubblan, om `sender === 'ai'` och innehallet matchar bokforingsforslag-monster, rendera `ActionButtons`
- Knapparna visas bara pa det SISTA AI-meddelandet (styrs av ny prop `isLastAiMessage`)

### 3. `src/components/chat/MessageList.tsx`

- Skicka `onAction` callback och `isLastAiMessage` till `Message`
- `onAction` bubblar upp till `ChatInterface`

### 4. `src/components/ChatInterface.tsx`

- Ny funktion `handleActionButton(message: string)` som satter `inputValue` och triggar `handleSendMessage`
- Skickas ner till `MessageList` som prop

---

## Teknisk detalj

Detekteringslogik i `Message.tsx`:
```
const isBookingProposal = sender === 'ai' 
  && content.includes('Bokföringsförslag') 
  && content.includes('Ska jag bokföra detta?');
```

Knapparna forsvinner efter klick (genom att de bara visas pa sista AI-meddelandet -- nar anvandaren svarar och ett nytt meddelande laggs till ar det inte langre sista).

