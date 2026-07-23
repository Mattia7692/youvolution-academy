-- prezzo_snapshot e' superato da imponibile_snapshot/totale_snapshot
-- (introdotti nella migration precedente): stesso ruolo di "importo congelato
-- al momento dell'iscrizione", ma ora scomposto in imponibile + IVA invece di
-- un numero unico ambiguo. Nessun backfill: 0 righe in iscrizioni.
alter table public.iscrizioni drop column prezzo_snapshot;

-- get_coda_verifica() esponeva prezzo_snapshot nel proprio return type: va
-- ricreata (drop+create, non solo replace, perche' cambia l'elenco colonne).
drop function public.get_coda_verifica();

create function public.get_coda_verifica()
returns table (
  id uuid,
  stato text,
  cro text,
  cro_inserito_at timestamptz,
  imponibile_snapshot numeric,
  totale_snapshot numeric,
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
    i.id, i.stato, i.cro, i.cro_inserito_at, i.imponibile_snapshot, i.totale_snapshot,
    i.created_at, i.updated_at, c.titolo, p.nome, p.cognome, p.email
  from public.iscrizioni i
  join public.corsi c on c.id = i.corso_id
  join public.profiles p on p.id = i.corsista_id
  where i.stato in ('cro_inserito', 'cro_da_chiarire');
$$;

revoke execute on function public.get_coda_verifica() from public, anon, authenticated;
grant execute on function public.get_coda_verifica() to make_reader;
