-- Coerente con la scelta di nascondere gli owner agli admin semplici anche
-- in lista (non solo impedire di modificarli): estende la stessa
-- restrizione alla SELECT, cosi' la barriera e' nel database e non solo
-- nella query della pagina lista. profiles_select_own resta invariata e
-- continua a garantire a ciascuno la lettura della propria riga.
-- Nessuna query esistente fa join verso profiles tramite verificata_da (solo
-- verso corsista_id), quindi questa restrizione non rompe altre pagine.
drop policy "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select
  using (public.is_owner() or (public.is_admin() and ruolo <> 'owner'));
