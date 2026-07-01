-- Hardening pass in risposta al security advisor dopo le prime 5 migration:
-- 1) le funzioni trigger/helper interne non devono essere chiamabili via REST RPC
--    da anon/authenticated (altrimenti un corsista potrebbe invocare log_azione()
--    direttamente e falsificare il log, o invocare le altre a vuoto);
-- 2) set_updated_at non aveva search_path fisso;
-- 3) citext va installata nello schema extensions, non in public;
-- 4) iscrizioni_coda era una vista "security definer"-equivalente (ERROR nel
--    linter): sostituita con una funzione SECURITY DEFINER esplicita, il cui
--    EXECUTE e' concesso solo a make_reader — stesso pattern usato nella
--    piattaforma enterprise per le letture privilegiate.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.blocca_cambio_ruolo() from public;
revoke execute on function public.guardia_iscrizioni() from public;
revoke execute on function public.log_cambio_stato_iscrizione() from public;
revoke execute on function public.log_azione(text, uuid, jsonb, text) from public;

alter function public.set_updated_at() set search_path = public;

alter extension citext set schema extensions;

drop view public.iscrizioni_coda;

create function public.get_coda_verifica()
returns table (
  id uuid,
  stato text,
  cro text,
  cro_inserito_at timestamptz,
  prezzo_snapshot numeric,
  created_at timestamptz,
  updated_at timestamptz,
  corso_titolo text,
  nome text,
  cognome text,
  email extensions.citext
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id, i.stato, i.cro, i.cro_inserito_at, i.prezzo_snapshot, i.created_at, i.updated_at,
    c.titolo, p.nome, p.cognome, p.email
  from public.iscrizioni i
  join public.corsi c on c.id = i.corso_id
  join public.profiles p on p.id = i.corsista_id
  where i.stato in ('cro_inserito', 'cro_da_chiarire');
$$;

revoke execute on function public.get_coda_verifica() from public;
grant execute on function public.get_coda_verifica() to make_reader;
