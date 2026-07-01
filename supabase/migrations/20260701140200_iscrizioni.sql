-- Iscrizioni: Modulo 1 (dati fiscali + prezzo) -> Modulo 2 (CRO bonifico) -> verifica admin.
-- Il pagamento resta interamente esterno (bonifico): la piattaforma registra solo il CRO.
create table public.iscrizioni (
  id uuid primary key default gen_random_uuid(),
  corsista_id uuid not null references public.profiles (id) on delete cascade,
  corso_id uuid not null references public.corsi (id),
  stato text not null default 'bozza'
    check (stato in ('bozza', 'in_attesa_pagamento', 'cro_inserito', 'verificata', 'cro_da_chiarire')),

  -- Modulo 1: dati fiscali (raccolti qui, non in registrazione) + prezzo congelato
  -- al momento dell'iscrizione (indipendente da futuri cambi di prezzo del corso).
  tipo_soggetto text check (tipo_soggetto in ('privato', 'azienda')),
  ragione_sociale text,
  codice_fiscale text,
  partita_iva text,
  indirizzo text,
  cap text,
  citta text,
  provincia text,
  nazione text default 'IT',
  codice_sdi text,
  pec text,
  prezzo_snapshot numeric(10, 2),

  -- Modulo 2
  cro text,
  cro_inserito_at timestamptz,

  -- Verifica admin
  verificata_da uuid references public.profiles (id),
  verificata_at timestamptz,
  nota_admin text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.iscrizioni enable row level security;

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_iscrizioni_updated_at
  before update on public.iscrizioni
  for each row execute function public.set_updated_at();

-- Difesa in profondita' oltre alle policy RLS sotto: anche un update che
-- passasse i controlli RLS (es. per un bug futuro) viene bloccato qui se
-- tenta di verificare/segnalare un'iscrizione o modificarne i campi di
-- verifica senza essere admin, o di modificare un'iscrizione gia' verificata.
create function public.guardia_iscrizioni()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chiamante_admin boolean := coalesce(auth.role(), 'service_role') = 'service_role' or public.is_admin();
begin
  if new.stato in ('verificata', 'cro_da_chiarire') and old.stato not in ('verificata', 'cro_da_chiarire') then
    if not chiamante_admin then
      raise exception 'Solo un admin puo verificare o segnalare un''iscrizione';
    end if;
  end if;

  if (new.verificata_da is distinct from old.verificata_da
      or new.verificata_at is distinct from old.verificata_at
      or new.nota_admin is distinct from old.nota_admin)
     and not chiamante_admin then
    raise exception 'Solo un admin puo compilare i campi di verifica';
  end if;

  if old.stato = 'verificata' and not chiamante_admin then
    raise exception 'Iscrizione gia'' verificata, non modificabile';
  end if;

  return new;
end;
$$;

create trigger trg_guardia_iscrizioni
  before update on public.iscrizioni
  for each row execute function public.guardia_iscrizioni();

create policy "iscrizioni_select_own_o_admin" on public.iscrizioni
  for select using (corsista_id = auth.uid() or public.is_admin());

create policy "iscrizioni_insert_own" on public.iscrizioni
  for insert with check (corsista_id = auth.uid());

create policy "iscrizioni_update_own_o_admin" on public.iscrizioni
  for update using (corsista_id = auth.uid() or public.is_admin())
  with check (corsista_id = auth.uid() or public.is_admin());

-- Nessuna policy di delete: le iscrizioni non si cancellano, si storicizzano.
