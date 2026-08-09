-- Iscrizioni personalizzate a rate: accordi commerciali negoziati caso per
-- caso (N rate, importi liberi), create dall'admin bypassando passo-1/2.
-- iscrizioni.stato per una riga con piano personalizzato resta
-- 'in_attesa_pagamento' finche' non TUTTE le rate sono verificate (vedi
-- verificaRata in admin/actions.ts, che aggiorna anche la riga madre).
create table public.iscrizioni_rate (
  id uuid primary key default gen_random_uuid(),
  iscrizione_id uuid not null references public.iscrizioni (id) on delete cascade,
  numero int not null,
  importo numeric(10, 2) not null check (importo > 0),
  scadenza date,

  stato text not null default 'in_attesa_pagamento'
    check (stato in ('in_attesa_pagamento', 'cro_inserito', 'verificata', 'cro_da_chiarire')),

  cro text,
  cro_inserito_at timestamptz,
  bonifico_data date,
  bonifico_banca_ordinante text,
  bonifico_ammontare numeric(10, 2),

  verificata_da uuid references public.profiles (id),
  verificata_at timestamptz,
  nota_admin text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (iscrizione_id, numero)
);

alter table public.iscrizioni_rate enable row level security;

create trigger trg_iscrizioni_rate_updated_at
  before update on public.iscrizioni_rate
  for each row execute function public.set_updated_at();

-- Copia 1:1 della guardia anti-frode di guardia_iscrizioni(), sulla tabella
-- delle rate: solo un admin puo' verificare/segnalare, solo un admin puo'
-- compilare i campi di verifica, nessuno puo' modificare una rata gia'
-- verificata.
create function public.guardia_iscrizioni_rate()
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
      raise exception 'Solo un admin puo verificare o segnalare una rata';
    end if;
  end if;

  if (new.verificata_da is distinct from old.verificata_da
      or new.verificata_at is distinct from old.verificata_at
      or new.nota_admin is distinct from old.nota_admin)
     and not chiamante_admin then
    raise exception 'Solo un admin puo compilare i campi di verifica';
  end if;

  if old.stato = 'verificata' and not chiamante_admin then
    raise exception 'Rata gia'' verificata, non modificabile';
  end if;

  return new;
end;
$$;

revoke execute on function public.guardia_iscrizioni_rate() from public, anon, authenticated;

create trigger trg_guardia_iscrizioni_rate
  before update on public.iscrizioni_rate
  for each row execute function public.guardia_iscrizioni_rate();

create policy "iscrizioni_rate_select_own_o_admin" on public.iscrizioni_rate
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.iscrizioni i
      where i.id = iscrizioni_rate.iscrizione_id and i.corsista_id = auth.uid()
    )
  );

-- Solo l'admin crea rate (l'iscrizione personalizzata nasce da zero lato
-- admin, il corsista non seleziona/genera mai un piano da solo).
create policy "iscrizioni_rate_insert_admin" on public.iscrizioni_rate
  for insert with check (public.is_admin());

-- Il corsista aggiorna la propria rata solo per inserire il CRO (passo-2
-- equivalente): la guardia sopra impedisce comunque di toccare stato di
-- verifica/campi riservati senza essere admin.
create policy "iscrizioni_rate_update_own_o_admin" on public.iscrizioni_rate
  for update using (
    public.is_admin()
    or exists (
      select 1 from public.iscrizioni i
      where i.id = iscrizioni_rate.iscrizione_id and i.corsista_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.iscrizioni i
      where i.id = iscrizioni_rate.iscrizione_id and i.corsista_id = auth.uid()
    )
  );

-- Nessuna policy di delete: le rate restano storicizzate, come le iscrizioni.
