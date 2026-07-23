-- Il controllo di capienza al Passo 1 deve contare le iscrizioni verificate
-- di TUTTI i corsisti per un modulo/pacchetto, ma le RLS di iscrizioni e
-- iscrizione_moduli mostrano a un corsista solo le proprie righe. Serve una
-- funzione SECURITY DEFINER dedicata, sullo stesso pattern di
-- valida_codice_sconto(): lasciata eseguibile da anon/authenticated di
-- proposito, perche' e' l'unico modo per il form di iscrizione di sapere se
-- c'e' ancora posto, senza esporre l'elenco delle iscrizioni altrui.
create function public.posti_occupati_modulo(p_modulo_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.iscrizione_moduli im
  join public.iscrizioni i on i.id = im.iscrizione_id
  where im.modulo_id = p_modulo_id and i.stato = 'verificata';
$$;

create function public.posti_occupati_pacchetto(p_pacchetto_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.iscrizioni i
  where i.pacchetto_id = p_pacchetto_id and i.stato = 'verificata';
$$;
