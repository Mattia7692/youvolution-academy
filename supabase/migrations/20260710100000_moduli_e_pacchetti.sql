-- Corsi multi-modulo: un corso puo' essere composto da piu' moduli acquistabili
-- singolarmente, ciascuno con il proprio prezzo e le proprie scadenze
-- (iscrizione + early bird). Un corso "semplice" e' semplicemente un corso con
-- un solo modulo: nessun modello separato, cosi' il prezzo vive in un solo
-- posto invece che sdoppiato fra corsi.prezzo e moduli_corso.prezzo.
create table public.moduli_corso (
  id uuid primary key default gen_random_uuid(),
  corso_id uuid not null references public.corsi (id),
  titolo text not null,
  ordine integer not null default 0,
  imponibile numeric(10, 2) not null check (imponibile >= 0),
  scadenza_iscrizione date not null,
  data_early_bird date not null check (data_early_bird <= scadenza_iscrizione),
  -- L'admin decide quali moduli sono sempre inclusi (non deselezionabili) e
  -- quali sono acquistabili a scelta del corsista.
  obbligatorio boolean not null default false,
  posti_disponibili integer check (posti_disponibili is null or posti_disponibili >= 0),
  -- Chiusura manuale indipendente dal conteggio posti: l'admin puo' chiudere
  -- le iscrizioni a un modulo a sua discrezione, non solo al raggiungimento
  -- della capienza.
  iscrizioni_chiuse boolean not null default false,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.moduli_corso enable row level security;

create policy "moduli_corso_select_pubblica" on public.moduli_corso
  for select using (attivo or public.is_admin());

create policy "moduli_corso_admin_scrittura" on public.moduli_corso
  for all using (public.is_admin()) with check (public.is_admin());

-- Pacchetto: acquisto cumulativo di piu' moduli a prezzo scontato, con
-- scadenza e early bird PROPRI (indipendenti da quelli dei singoli moduli:
-- nell'esempio reale coincidono col primo modulo, ma non e' garantito).
create table public.pacchetti_corso (
  id uuid primary key default gen_random_uuid(),
  corso_id uuid not null references public.corsi (id),
  titolo text not null default 'Tutti i moduli',
  imponibile numeric(10, 2) not null check (imponibile >= 0),
  scadenza_iscrizione date not null,
  data_early_bird date not null check (data_early_bird <= scadenza_iscrizione),
  posti_disponibili integer check (posti_disponibili is null or posti_disponibili >= 0),
  iscrizioni_chiuse boolean not null default false,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.pacchetti_corso enable row level security;

create policy "pacchetti_corso_select_pubblica" on public.pacchetti_corso
  for select using (attivo or public.is_admin());

create policy "pacchetti_corso_admin_scrittura" on public.pacchetti_corso
  for all using (public.is_admin()) with check (public.is_admin());

-- Composizione del pacchetto: non si assume "sempre tutti i moduli del
-- corso", l'admin sceglie esplicitamente quali moduli include (in previsione
-- di eventuali pacchetti parziali futuri).
create table public.pacchetto_moduli (
  pacchetto_id uuid not null references public.pacchetti_corso (id) on delete cascade,
  modulo_id uuid not null references public.moduli_corso (id),
  primary key (pacchetto_id, modulo_id)
);

alter table public.pacchetto_moduli enable row level security;

create policy "pacchetto_moduli_select_pubblica" on public.pacchetto_moduli
  for select using (true);

create policy "pacchetto_moduli_admin_scrittura" on public.pacchetto_moduli
  for all using (public.is_admin()) with check (public.is_admin());
