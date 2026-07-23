-- Prezzo e capienza ora vivono sempre su moduli_corso/pacchetti_corso, mai
-- direttamente su corsi (anche un corso "semplice" e' un corso con un solo
-- modulo: un solo posto dove vive il prezzo, non due modelli in parallelo).
-- Nessun backfill necessario: 0 righe in corsi al momento di questa migrazione.
alter table public.corsi
  drop column prezzo,
  drop column posti_disponibili;
