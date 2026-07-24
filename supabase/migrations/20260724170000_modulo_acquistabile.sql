-- Separa "il modulo esiste/e' configurato" (attivo) da "e' acquistabile a se
-- stante" (acquistabile): un modulo puo' restare attivo (visibile, incluso
-- nei pacchetti, conteggiato nelle statistiche) ma non acquistabile
-- singolarmente — es. i moduli II-VII di un corso Level 2 disponibili solo
-- tramite pacchetto. Prima questa distinzione veniva forzata riusando
-- "attivo", che pero' e' anche il campo controllato dalla RLS pubblica.
alter table public.moduli_corso add column acquistabile boolean not null default true;
