-- Alcuni moduli sono seguiti da uno o piu' webinar di completamento (es.
-- Professional Coach FUTURE, moduli II-IV e VI): a differenza delle date del
-- modulo stesso (solo giorno), i webinar hanno anche un orario, quindi
-- servono colonne timestamptz dedicate invece di riusare scadenza_iscrizione/
-- data_inizio di moduli_corso.
create table public.webinar_modulo (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.moduli_corso (id) on delete cascade,
  titolo text not null,
  inizio timestamptz not null,
  fine timestamptz not null check (fine > inizio),
  ordine integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.webinar_modulo enable row level security;

-- Stessa regola di visibilita' del modulo a cui appartengono: pubblico se il
-- modulo e' attivo, altrimenti solo admin.
create policy "webinar_modulo_select_pubblica" on public.webinar_modulo
  for select using (
    exists (
      select 1 from public.moduli_corso m
      where m.id = webinar_modulo.modulo_id and (m.attivo or public.is_admin())
    )
  );

create policy "webinar_modulo_admin_scrittura" on public.webinar_modulo
  for all using (public.is_admin()) with check (public.is_admin());
