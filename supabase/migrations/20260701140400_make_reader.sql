-- Ruolo dedicato per l'automazione (Make): puo' leggere la coda di verifica
-- tramite una vista, ma non ha alcun grant di scrittura ne' accesso diretto
-- alle tabelle sottostanti. Il blocco e' strutturale (a livello di GRANT), non
-- solo una RLS policy che si potrebbe disattivare per errore in futuro.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'make_reader') then
    create role make_reader nologin;
  end if;
end $$;

-- Permette a PostgREST (che si connette come `authenticator`) di passare a
-- `make_reader` quando riceve un JWT con claim "role": "make_reader".
grant make_reader to authenticator;

grant usage on schema public to make_reader;

create view public.iscrizioni_coda as
select
  i.id,
  i.stato,
  i.cro,
  i.cro_inserito_at,
  i.prezzo_snapshot,
  i.created_at,
  i.updated_at,
  c.titolo as corso_titolo,
  p.nome,
  p.cognome,
  p.email
from public.iscrizioni i
join public.corsi c on c.id = i.corso_id
join public.profiles p on p.id = i.corsista_id
where i.stato in ('cro_inserito', 'cro_da_chiarire');

-- Unico grant per make_reader: solo SELECT sulla vista, niente sulle tabelle
-- iscrizioni/profiles/corsi/log_azioni.
grant select on public.iscrizioni_coda to make_reader;
