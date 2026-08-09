-- L'iscrizione personalizzata a rate viene creata dall'admin per conto di un
-- altro corsista (corsista_id != auth.uid() del chiamante): le policy INSERT
-- esistenti su iscrizioni/iscrizione_moduli permettevano solo l'auto-
-- iscrizione (corsista_id = auth.uid()), qui le estendiamo per includere
-- l'admin.
drop policy "iscrizioni_insert_own" on public.iscrizioni;

create policy "iscrizioni_insert_own_o_admin" on public.iscrizioni
  for insert with check (corsista_id = auth.uid() or public.is_admin());

drop policy "iscrizione_moduli_insert_own" on public.iscrizione_moduli;

create policy "iscrizione_moduli_insert_own_o_admin" on public.iscrizione_moduli
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.iscrizioni i
      where i.id = iscrizione_moduli.iscrizione_id and i.corsista_id = auth.uid()
    )
  );
