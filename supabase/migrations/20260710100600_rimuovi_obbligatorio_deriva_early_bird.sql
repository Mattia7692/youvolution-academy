-- Due cambi di modello, richiesti dopo il primo giro di test:
--
-- 1) Il concetto di modulo "obbligatorio" sparisce: la selezione dei moduli
--    e' sempre libera per il corsista, l'admin non puo' forzarne l'inclusione.
--
-- 2) L'early bird non e' piu' una data configurata a mano per modulo/pacchetto:
--    e' sempre derivata, a livello di intero corso, come 16 giorni prima
--    della data di inizio del PRIMO modulo del corso (il modulo con
--    data_inizio piu' vicina) — indipendentemente da quali moduli il
--    corsista scelga di acquistare. Serve quindi sapere quando inizia
--    ciascun modulo: data_early_bird lascia il posto a data_inizio.
alter table public.moduli_corso drop column obbligatorio;
alter table public.moduli_corso drop column data_early_bird;
alter table public.pacchetti_corso drop column data_early_bird;

alter table public.moduli_corso
  add column data_inizio date not null,
  add constraint moduli_corso_scadenza_prima_inizio check (scadenza_iscrizione <= data_inizio);
