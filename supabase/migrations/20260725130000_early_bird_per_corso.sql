-- L'early bird era derivato in automatico (16 giorni prima del primo
-- modulo, sconto fisso 10%) per ogni corso: si e' rivelato sbagliato per
-- corsi reali (Professional Coach ha il 20% a data fissa, Team & Group
-- Coaching Advanced il 10% a data fissa, non "16 giorni prima"). L'early
-- bird diventa una scelta esplicita dell'admin in fase di creazione corso:
-- una data di scadenza e una percentuale, valide per l'intero corso. Se il
-- corso non offre early bird, entrambi i campi restano null — i corsi che
-- hanno gia' un prezzo early-bird incorporato nei propri pacchetti (es.
-- Core Coaching) devono lasciarli null per non scontare due volte.
alter table public.corsi
  add column early_bird_scadenza date,
  add column early_bird_percentuale numeric(5, 2) check (
    early_bird_percentuale is null or (early_bird_percentuale >= 0 and early_bird_percentuale <= 100)
  ),
  add constraint corsi_early_bird_coerente check (
    (early_bird_scadenza is null) = (early_bird_percentuale is null)
  );
