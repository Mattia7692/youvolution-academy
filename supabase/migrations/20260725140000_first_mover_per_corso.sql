-- Sconto "first mover": una finestra ancora precedente all'early bird,
-- stesso pattern (data di scadenza + percentuale espliciti per corso,
-- entrambi null o entrambi valorizzati). In salvaPasso1 la precedenza e'
-- first_mover > early_bird > codice (non cumulabili).
alter table public.corsi
  add column first_mover_scadenza date,
  add column first_mover_percentuale numeric(5, 2) check (
    first_mover_percentuale is null or (first_mover_percentuale >= 0 and first_mover_percentuale <= 100)
  ),
  add constraint corsi_first_mover_coerente check (
    (first_mover_scadenza is null) = (first_mover_percentuale is null)
  );

alter table public.iscrizioni drop constraint iscrizioni_sconto_tipo_check;
alter table public.iscrizioni add constraint iscrizioni_sconto_tipo_check
  check (sconto_tipo in ('nessuno', 'early_bird', 'first_mover', 'codice'));
