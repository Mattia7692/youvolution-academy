-- Scontistica ridotta a un solo meccanismo manuale: l'early bird resta
-- automatico (in base alle date su moduli_corso/pacchetti_corso), tutto il
-- resto (alumni, amico, transizione di carriera, promo generiche) diventa un
-- singolo codice sconto che l'organizzazione crea e comunica via email.
-- Non cumulabile con l'early bird ne' con altri codici: la scelta di quale
-- applicare avviene lato server action al momento del Passo 1.
create table public.codici_sconto (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique,
  percentuale numeric(5, 2) not null check (percentuale > 0 and percentuale <= 100),
  corso_id uuid references public.corsi (id), -- null = valido su tutti i corsi
  valido_da date,
  valido_a date,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.codici_sconto enable row level security;

-- Nessuna policy di select per non-admin: la tabella non e' leggibile via
-- REST da un corsista (evita che chiunque possa elencare tutti i codici
-- promozionali esistenti). La validazione passa solo dalla funzione sotto.
create policy "codici_sconto_admin" on public.codici_sconto
  for all using (public.is_admin()) with check (public.is_admin());

-- Validazione di un codice senza esporre la tabella intera: ritorna la
-- percentuale se il codice e' valido per il corso indicato, NULL altrimenti.
-- Lasciata eseguibile da anon/authenticated di proposito (come is_admin()):
-- e' l'unico modo per il form di iscrizione di verificare un codice.
create function public.valida_codice_sconto(p_codice text, p_corso_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select percentuale
  from public.codici_sconto
  where upper(codice) = upper(trim(p_codice))
    and attivo
    and (corso_id is null or corso_id = p_corso_id)
    and (valido_da is null or valido_da <= current_date)
    and (valido_a is null or valido_a >= current_date)
  limit 1;
$$;
