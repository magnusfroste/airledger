-- Lägg till kontantmetod-specifika mallar
INSERT INTO public.airledger_transaction_templates (
  user_id,
  template_name,
  description,
  category,
  is_recurring,
  recurring_frequency,
  template_entries,
  is_system_template,
  keywords,
  auto_suggest
) VALUES
  -- Betalning från försäljning (kontantmetoden)
  (
    '00000000-0000-0000-0000-000000000000',
    'Betalning från försäljning 25% moms',
    'För kontantmetoden - bokför när kunden betalar för försäljning med 25% moms',
    'Intäkter',
    false,
    null,
    '[
      {
        "account_code": "1920",
        "account_name": "Bank",
        "entry_type": "debit",
        "amount_type": "total"
      },
      {
        "account_code": "3001",
        "account_name": "Försäljning 25% moms",
        "entry_type": "credit",
        "amount_type": "net"
      },
      {
        "account_code": "2611",  
        "account_name": "Utgående moms 25%",
        "entry_type": "credit",
        "amount_type": "vat",
        "vat_rate": 25
      }
    ]',
    true,
    ARRAY['betalning', 'kund', 'försäljning', 'inbetalning', 'kontant', '25%'],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Betalning från försäljning 12% moms',
    'För kontantmetoden - bokför när kunden betalar för försäljning med 12% moms',
    'Intäkter',
    false,
    null,
    '[
      {
        "account_code": "1920",
        "account_name": "Bank",
        "entry_type": "debit",
        "amount_type": "total"
      },
      {
        "account_code": "3002",
        "account_name": "Försäljning 12% moms",
        "entry_type": "credit",
        "amount_type": "net"
      },
      {
        "account_code": "2621",
        "account_name": "Utgående moms 12%",
        "entry_type": "credit",
        "amount_type": "vat",
        "vat_rate": 12
      }
    ]',
    true,
    ARRAY['betalning', 'kund', 'försäljning', 'inbetalning', 'kontant', '12%'],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Betalning från försäljning 6% moms',
    'För kontantmetoden - bokför när kunden betalar för försäljning med 6% moms',
    'Intäkter',
    false,
    null,
    '[
      {
        "account_code": "1920",
        "account_name": "Bank",
        "entry_type": "debit",
        "amount_type": "total"
      },
      {
        "account_code": "3003",
        "account_name": "Försäljning 6% moms",
        "entry_type": "credit",
        "amount_type": "net"
      },
      {
        "account_code": "2631",
        "account_name": "Utgående moms 6%",
        "entry_type": "credit",
        "amount_type": "vat",
        "vat_rate": 6
      }
    ]',
    true,
    ARRAY['betalning', 'kund', 'försäljning', 'inbetalning', 'kontant', '6%'],
    true
  ),
  -- Betalning för inköp (kontantmetoden)
  (
    '00000000-0000-0000-0000-000000000000',
    'Betalning för inköp 25% moms',
    'För kontantmetoden - bokför när du betalar för inköp med 25% moms',
    'Kostnader',
    false,
    null,
    '[
      {
        "account_code": "4000",
        "account_name": "Inköp varor",
        "entry_type": "debit",
        "amount_type": "net"
      },
      {
        "account_code": "2641",
        "account_name": "Ingående moms 25%",
        "entry_type": "debit",
        "amount_type": "vat",
        "vat_rate": 25
      },
      {
        "account_code": "1920",
        "account_name": "Bank",
        "entry_type": "credit",
        "amount_type": "total"
      }
    ]',
    true,
    ARRAY['betalning', 'leverantör', 'inköp', 'utbetalning', 'kontant', '25%'],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Betalning för inköp 12% moms',
    'För kontantmetoden - bokför när du betalar för inköp med 12% moms',
    'Kostnader',
    false,
    null,
    '[
      {
        "account_code": "4000",
        "account_name": "Inköp varor",
        "entry_type": "debit",
        "amount_type": "net"
      },
      {
        "account_code": "2651",
        "account_name": "Ingående moms 12%",
        "entry_type": "debit",
        "amount_type": "vat",
        "vat_rate": 12
      },
      {
        "account_code": "1920",
        "account_name": "Bank",
        "entry_type": "credit",
        "amount_type": "total"
      }
    ]',
    true,
    ARRAY['betalning', 'leverantör', 'inköp', 'utbetalning', 'kontant', '12%'],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Betalning för inköp 6% moms',
    'För kontantmetoden - bokför när du betalar för inköp med 6% moms',
    'Kostnader',
    false,
    null,
    '[
      {
        "account_code": "4000",
        "account_name": "Inköp varor",
        "entry_type": "debit",
        "amount_type": "net"
      },
      {
        "account_code": "2661",
        "account_name": "Ingående moms 6%",
        "entry_type": "debit",
        "amount_type": "vat",
        "vat_rate": 6
      },
      {
        "account_code": "1920",
        "account_name": "Bank",
        "entry_type": "credit",
        "amount_type": "total"
      }
    ]',
    true,
    ARRAY['betalning', 'leverantör', 'inköp', 'utbetalning', 'kontant', '6%'],
    true
  ),
  -- Kontantmetod-specifika templates för vanliga kostnader
  (
    '00000000-0000-0000-0000-000000000000',
    'Hyresbetalning',
    'För kontantmetoden - bokför hyra när den betalas',
    'Driftskostnader',
    true,
    'monthly',
    '[
      {
        "account_code": "5010",
        "account_name": "Lokalhyra",
        "entry_type": "debit",
        "amount_type": "total"
      },
      {
        "account_code": "1920",
        "account_name": "Bank",
        "entry_type": "credit",
        "amount_type": "total"
      }
    ]',
    true,
    ARRAY['hyra', 'lokal', 'betalning', 'kontant', 'månadsvis'],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Lönebetalning',
    'För kontantmetoden - bokför lön när den betalas ut',
    'Personalkostnader',
    true,
    'monthly',
    '[
      {
        "account_code": "7010",
        "account_name": "Löner",
        "entry_type": "debit",
        "amount_type": "total"
      },
      {
        "account_code": "1920",
        "account_name": "Bank",
        "entry_type": "credit",
        "amount_type": "total"
      }
    ]',
    true,
    ARRAY['lön', 'personal', 'betalning', 'kontant', 'månadsvis'],
    true
  );