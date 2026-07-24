-- Ogni corso ha un solo conto su cui i corsisti devono bonificare: sceglie
-- l'admin in fase di creazione, il passo 2 dell'iscrizione mostra le
-- coordinate corrette in base a questo campo. Default 'allianz' perche' e'
-- il conto usato finora da tutti i corsi esistenti.
alter table public.corsi
  add column metodo_pagamento text not null default 'allianz'
    check (metodo_pagamento in ('allianz', 'fineco'));
