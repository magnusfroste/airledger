

# Uppdatera keywords for Bankkostnader-mallen

## Vad som behover andras

Mallen **Bankkostnader** (konto 6570) har idag dessa keywords:
`bankavgift, bankkostnad, transaktionsavgift, bank, kontoavgift, arsavgift, avgift`

SEB anvander formuleringen **"Banktjanster"** pa sina utdrag, vilket inte matchas. Darfor hamnar dessa transaktioner pa fel konto vid import.

## Losning

En databasmigration som laggar till foljande keywords i Bankkostnader-mallen:

- `banktjanst`
- `banktjanster`
- `serviceavgift`

Ingen kodandring behovs -- den delade kontextplattformens `matchSingleTransaction` anvander redan keyword-matchning mot mallbiblioteket. Nar keywords ar korrekta fungerar matchningen automatiskt.

## Teknisk implementering

| Fil | Andring |
|-----|---------|
| Databasmigration | UPDATE keywords-array pa template `483db5b4-...` (Bankkostnader) |

SQL:
```text
UPDATE airledger_transaction_templates
SET keywords = keywords || '{"banktjänst","banktjänster","serviceavgift"}'::text[]
WHERE id = '483db5b4-dd9e-4b49-ad62-c2d23fc866ff';
```

## Resultat

Nasta gang ett bankutdrag med "Banktjanster" importeras matchas det direkt mot 6570 Bankkostnader via template-matchern, utan att AI:n behover gissa.
