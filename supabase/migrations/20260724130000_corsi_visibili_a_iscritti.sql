-- La policy originale nascondeva un corso disattivato anche al corsista che
-- vi si era iscritto: "Le mie iscrizioni" fa una join annidata su corsi(titolo)
-- e PostgREST applica la RLS della tabella anche alle risorse annidate, quindi
-- il titolo spariva (fallback "Corso") non appena l'admin disattivava il
-- corso — es. dopo averlo duplicato per una nuova edizione. Le iscrizioni
-- restano per sempre (nessuna policy di delete): anche il corso collegato
-- deve restare visibile per sempre a chi vi si e' iscritto.
drop policy "corsi_select_attivi_o_admin" on public.corsi;

create policy "corsi_select_attivi_o_admin_o_iscritto" on public.corsi
  for select using (
    attivo
    or public.is_admin()
    or exists (
      select 1 from public.iscrizioni i
      where i.corso_id = corsi.id and i.corsista_id = auth.uid()
    )
  );
