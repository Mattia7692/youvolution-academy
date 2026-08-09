-- "Fatturazione a soggetto diverso" a livello di account, come i dati
-- anagrafici/fiscali aggiunti in 20260809100200_dati_fiscali_profilo.sql:
-- il corsista la gestisce da "Il mio account", l'admin non la raccoglie piu'
-- in fase di creazione dell'iscrizione su misura.
alter table public.profiles
  add column fatturazione_diversa boolean not null default false,
  add column fatturazione_intestazione text,
  add column fatturazione_indirizzo text,
  add column fatturazione_cap text,
  add column fatturazione_codice_fiscale_piva text,
  add column fatturazione_codice_sdi text;
