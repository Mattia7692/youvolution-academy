-- CRM corsisti: azienda/ruolo aziendale (raccolti dal corsista, correggibili
-- dall'admin, stesso pattern delle colonne fiscali in
-- 20260809100200_dati_fiscali_profilo.sql), nota interna admin-only, e
-- intake delle richieste di cancellazione GDPR (solo la richiesta: la
-- cancellazione/anonimizzazione effettiva resta un processo manuale fuori
-- piattaforma, deciso caso per caso).

alter table public.profiles
  add column azienda text,
  add column ruolo_aziendale text;

-- Nota interna dell'admin sul corsista: tabella separata, non colonna su
-- profiles, apposta. Una colonna sarebbe comunque leggibile dal corsista con
-- un "select *" lato client nonostante la RLS (che e' per riga, non per
-- colonna); una tabella a parte senza nessuna policy di select per il
-- proprietario la esclude strutturalmente. Nome distinto da
-- iscrizioni.nota_admin/iscrizioni_rate.nota_admin, che sono un concetto
-- diverso (motivo di una segnalazione CRO su una singola iscrizione/rata,
-- non una nota libera sulla persona).
create table public.profili_note_admin (
  profilo_id uuid primary key references public.profiles (id) on delete cascade,
  nota text not null default '',
  aggiornata_da uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.profili_note_admin enable row level security;

create trigger trg_profili_note_admin_updated_at
  before update on public.profili_note_admin
  for each row execute function public.set_updated_at();

-- Nessuna policy per il proprietario: solo admin/owner leggono e scrivono.
create policy "profili_note_admin_admin" on public.profili_note_admin
  for all using (public.is_admin()) with check (public.is_admin());

-- Richiesta di cancellazione: il corsista la crea da "Il mio account", resta
-- 'in_attesa' finche' un admin non la gestisce (fuori piattaforma) e la
-- segna 'gestita' con una nota libera su cosa e' stato fatto.
create table public.richieste_cancellazione (
  id uuid primary key default gen_random_uuid(),
  profilo_id uuid not null references public.profiles (id) on delete cascade,
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'gestita')),
  messaggio text,
  gestita_da uuid references public.profiles (id),
  gestita_at timestamptz,
  nota_gestione text,
  created_at timestamptz not null default now()
);

alter table public.richieste_cancellazione enable row level security;

-- Al piu' una richiesta in_attesa per profilo: evita che il corsista ne
-- accumuli multiple cliccando ripetutamente, senza bisogno di un controllo
-- applicativo a parte per garantirlo.
create unique index richieste_cancellazione_una_in_attesa
  on public.richieste_cancellazione (profilo_id)
  where stato = 'in_attesa';

create policy "richieste_cancellazione_select_own_o_admin" on public.richieste_cancellazione
  for select using (profilo_id = auth.uid() or public.is_admin());

create policy "richieste_cancellazione_insert_own" on public.richieste_cancellazione
  for insert with check (profilo_id = auth.uid());

create policy "richieste_cancellazione_update_admin" on public.richieste_cancellazione
  for update using (public.is_admin()) with check (public.is_admin());
