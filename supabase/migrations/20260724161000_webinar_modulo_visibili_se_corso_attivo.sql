-- Stessa correzione della policy di moduli_corso: i webinar di un modulo
-- non acquistabile singolarmente devono restare visibili se il corso e'
-- attivo, non solo agli admin.
drop policy "webinar_modulo_select_pubblica" on public.webinar_modulo;

create policy "webinar_modulo_select_pubblica" on public.webinar_modulo
  for select using (
    exists (
      select 1 from public.moduli_corso m
      join public.corsi c on c.id = m.corso_id
      where m.id = webinar_modulo.modulo_id and (m.attivo or public.is_admin() or c.attivo)
    )
  );
