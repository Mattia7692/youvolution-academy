-- Dati anagrafici/fiscali a livello di account, non solo per singola
-- iscrizione: una volta che un'iscrizione e' 'verificata' il trigger
-- guardia_iscrizioni ne blocca ogni modifica, quindi il corsista non puo'
-- piu' correggerli li'. Qui vivono i dati "correnti" dell'account (pagina
-- "Il mio account"), separati dagli snapshot congelati per fatturazione su
-- iscrizioni.tipo_soggetto/ecc, che restano intatti come prova di cosa e'
-- stato fatturato al momento di ogni iscrizione.
alter table public.profiles
  add column tipo_soggetto text check (tipo_soggetto in ('privato', 'azienda', 'libero_professionista')),
  add column ragione_sociale text,
  add column codice_fiscale text,
  add column partita_iva text,
  add column indirizzo text,
  add column cap text,
  add column citta text,
  add column provincia text,
  add column nazione text default 'IT',
  add column codice_sdi text,
  add column pec text,
  add column cellulare text,
  add column data_nascita date;

-- Nessuna nuova RLS/trigger necessari: "profiles_update_own" gia' permette
-- al corsista di aggiornare la propria riga, e trg_blocca_cambio_ruolo
-- guarda solo il campo "ruolo".
