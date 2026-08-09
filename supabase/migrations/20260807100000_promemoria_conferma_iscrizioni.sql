-- Automazione Make: reminder a chi resta fermo allo step 1 (pagamento non
-- iniziato) e mail di conferma dopo la verifica del bonifico. Il controllo del
-- bonifico resta umano (admin da /admin/coda-verifica): Make legge lo stato e
-- manda le email, non decide mai se un'iscrizione e' verificata.
alter table public.iscrizioni
  add column promemoria_inviato_at timestamptz,
  add column conferma_inviata_at timestamptz;

-- guardia_iscrizioni() blocca oggi *qualunque* update su un'iscrizione gia'
-- verificata da parte di chi non e' admin. Serve un'eccezione mirata per
-- permettere a Make di segnare "conferma inviata" senza poter toccare nient'altro:
-- il confronto jsonb (esclusi updated_at e conferma_inviata_at) garantisce che
-- qualsiasi altra differenza faccia comunque fallire l'update.
create or replace function public.guardia_iscrizioni()
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
    if (to_jsonb(new) - array['updated_at', 'conferma_inviata_at'])
       is distinct from (to_jsonb(old) - array['updated_at', 'conferma_inviata_at']) then
      raise exception 'Iscrizione gia'' verificata, non modificabile';
    end if;
  end if;

  return new;
end;
$$;

-- Lettura: stesso pattern di get_coda_verifica(), granted a make_reader (resta
-- strutturalmente di sola lettura, nessun nuovo ruolo per queste due funzioni).
create function public.get_iscrizioni_da_sollecitare(soglia_giorni int default 3)
returns table (
  id uuid,
  corso_id uuid,
  corso_titolo text,
  nome text,
  cognome text,
  email extensions.citext,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.corso_id, c.titolo, p.nome, p.cognome, p.email, i.created_at
  from public.iscrizioni i
  join public.corsi c on c.id = i.corso_id
  join public.profiles p on p.id = i.corsista_id
  where i.stato = 'in_attesa_pagamento'
    and i.promemoria_inviato_at is null
    and i.created_at < now() - make_interval(days => soglia_giorni);
$$;

create function public.get_iscrizioni_da_confermare()
returns table (
  id uuid,
  corso_id uuid,
  corso_titolo text,
  nome text,
  cognome text,
  email extensions.citext,
  verificata_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.corso_id, c.titolo, p.nome, p.cognome, p.email, i.verificata_at
  from public.iscrizioni i
  join public.corsi c on c.id = i.corso_id
  join public.profiles p on p.id = i.corsista_id
  where i.stato = 'verificata'
    and i.conferma_inviata_at is null;
$$;

revoke execute on function public.get_iscrizioni_da_sollecitare(int) from public, anon, authenticated;
revoke execute on function public.get_iscrizioni_da_confermare() from public, anon, authenticated;
grant execute on function public.get_iscrizioni_da_sollecitare(int) to make_reader;
grant execute on function public.get_iscrizioni_da_confermare() to make_reader;

-- Scrittura: due funzioni strette (un solo campo timestamp ciascuna, filtro
-- sullo stato atteso), su un ruolo NUOVO e separato da make_reader, cosi'
-- make_reader resta a zero grant di scrittura come da progetto originale.
create function public.segna_promemoria_inviato(p_iscrizione_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.iscrizioni
  set promemoria_inviato_at = now()
  where id = p_iscrizione_id and stato = 'in_attesa_pagamento';
$$;

create function public.segna_conferma_inviata(p_iscrizione_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.iscrizioni
  set conferma_inviata_at = now()
  where id = p_iscrizione_id and stato = 'verificata';
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'make_writer') then
    create role make_writer nologin;
  end if;
end $$;

grant make_writer to authenticator;
grant usage on schema public to make_writer;

revoke execute on function public.segna_promemoria_inviato(uuid) from public, anon, authenticated;
revoke execute on function public.segna_conferma_inviata(uuid) from public, anon, authenticated;
grant execute on function public.segna_promemoria_inviato(uuid) to make_writer;
grant execute on function public.segna_conferma_inviata(uuid) to make_writer;
