-- I moduli non acquistabili singolarmente (es. Moduli II-VII di Professional
-- Coach, inclusi solo nei pacchetti) devono comunque essere visibili al
-- passo 1 come info sul programma del corso, non solo agli admin. La RLS
-- originale nascondeva qualunque modulo con attivo=false a un corsista.
drop policy "moduli_corso_select_pubblica" on public.moduli_corso;

create policy "moduli_corso_select_pubblica" on public.moduli_corso
  for select using (
    attivo
    or public.is_admin()
    or exists (
      select 1 from public.corsi c
      where c.id = moduli_corso.corso_id and c.attivo
    )
  );
