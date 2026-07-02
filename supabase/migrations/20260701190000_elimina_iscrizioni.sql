-- Permette all'admin di eliminare singole iscrizioni (es. dati di test, o per
-- sbloccare l'eliminazione di un corso altrimenti impedita dal vincolo di
-- integrita' referenziale). Le iscrizioni restano storicizzate per default:
-- questa e' un'eccezione esplicita, non il comportamento normale.

-- log_azioni referenzia iscrizioni: senza ON DELETE SET NULL, cancellare
-- un'iscrizione fallirebbe per lo stesso motivo per cui falliva cancellare il
-- corso (il proprio storico log la blocca). L'azione di eliminazione viene
-- comunque registrata nel log PRIMA della cancellazione (vedi server action),
-- quindi la SET NULL qui sotto scollega solo il riferimento, non la memoria
-- dell'evento.
alter table public.log_azioni drop constraint log_azioni_iscrizione_id_fkey;
alter table public.log_azioni
  add constraint log_azioni_iscrizione_id_fkey
  foreign key (iscrizione_id) references public.iscrizioni (id) on delete set null;

create policy "iscrizioni_delete_admin" on public.iscrizioni
  for delete using (public.is_admin());
