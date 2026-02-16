

# Air som kontextmedveten assistent -- Sammanlänkade bokföringsflöden

## Problemet

Idag matchar systemet **en mall per meddelande**. Men verkliga bokföringshändelser (som skatteåterbetalning) kräver ofta **två eller fler relaterade verifikationer**:

1. Skatteåterbetalning: Debet 1930 / Kredit 1640
2. Boka bort skatteskuld: Debet 2510 / Kredit 1640

Användaren förväntar sig att Air guidar genom hela flödet -- inte bara steg 1.

## Lösning: Sammanlänkade mallar (Follow-up Templates)

Istället för att göra AI-prompten smartare, utökar vi **mallsystemet** med ett nytt fält: `follow_up_templates`. Efter att en mall bokförts, kollar systemet om det finns uppföljningsmallar och föreslår dem automatiskt.

```text
Användare: "Skatteåterbetalning 12000 kr 9 dec"
    |
    v
[Mall: Skatteåterbetalning] --> Bokför Debet 1930 / Kredit 1640
    |
    v
[follow_up_templates: "Slutlig skatt"]
    |
    v
Air: "Vill du också boka bort skatteskulden mot skattefordran?
     Mall: Slutlig skatt -- Debet 2510 / Kredit 1640"
```

## Tekniska steg

### 1. Utöka mallschemat

Ny kolumn `follow_up_templates` (text-array) i `airledger_transaction_templates`. Innehaller mallnamn som ska foreslas efter bokning.

### 2. Uppdatera bekraftelseflödet

I `response-formatter.ts`, efter en lyckad bokning (`formatConfirmation`), kolla om mallen har `follow_up_templates`. Om ja, lägga till ett förslag i svaret:

"Vill du också bokföra [Mallnamn]? Belopp: [fråga eller hämta från snapshot]"

### 3. Berika med Financial Snapshot

Använd existerande `buildFinancialSnapshot` för att visa aktuellt saldo:

"Saldo på 1640 Skattefordringar: 36 000 kr. Saldo på 2510 Skatteskulder: -24 000 kr. Vill du boka bort skatteskulden?"

### 4. Konfigurera mallrelationer

Uppdatera relevanta mallar med `follow_up_templates`:

- **Skatteåterbetalning** -> follow_up: `["Slutlig skatt"]`
- **Preliminärskatt (F-skatt)** -> follow_up: (ingen, det är en löpande betalning)
- **Momsbetalning** -> follow_up: (ingen)

Fler relationer kan läggas till löpande via admin-gränssnittet.

### 5. Ingen prompt-ändring

Systemprompten förblir enkel. All logik ligger i malldata och deterministisk kod.

## Sammanfattning

- Mallsystemet utökas med `follow_up_templates` -- en array med mallnamn
- Efter lyckad bokning föreslår Air automatiskt nästa steg med saldo från snapshot
- Inga ändringar i AI-prompten -- logiken är helt malldriven
- Skalbart: nya flöden konfigureras genom att redigera mallar i admin

