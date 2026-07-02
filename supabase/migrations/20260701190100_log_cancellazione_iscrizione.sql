-- Registra automaticamente la cancellazione di un'iscrizione, prima che
-- avvenga (BEFORE DELETE, non AFTER: altrimenti old.id non esisterebbe piu'
-- nella tabella iscrizioni nel momento in cui log_azioni prova a referenziarlo).
-- Non si puo' fare questa logica dalla server action stessa: ne' log_azione()
-- ne' l'insert diretto su log_azioni sono permessi al ruolo authenticated
-- (nemmeno per un admin) — solo un trigger SECURITY DEFINER puo' scrivere qui,
-- proprio per impedire che chiunque possa falsificare il registro.
create function public.log_cancellazione_iscrizione()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_azione(
    'iscrizione_eliminata',
    old.id,
    jsonb_build_object(
      'corso_id', old.corso_id,
      'corsista_id', old.corsista_id,
      'stato_al_momento_eliminazione', old.stato
    )
  );
  return old;
end;
$$;

revoke execute on function public.log_cancellazione_iscrizione() from anon, authenticated;

create trigger trg_log_cancellazione_iscrizione
  before delete on public.iscrizioni
  for each row execute function public.log_cancellazione_iscrizione();
