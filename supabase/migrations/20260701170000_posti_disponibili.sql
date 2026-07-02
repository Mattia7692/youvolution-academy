-- Capienza del corso. NULL = nessun limite di posti.
alter table public.corsi
  add column posti_disponibili integer check (posti_disponibili is null or posti_disponibili >= 0);
