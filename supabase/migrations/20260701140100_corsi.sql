-- Corsi: catalogo, per ora popolato a mano dall'admin (nessun import esterno).
create table public.corsi (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  descrizione text,
  prezzo numeric(10, 2) not null check (prezzo >= 0),
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.corsi enable row level security;

create policy "corsi_select_attivi_o_admin" on public.corsi
  for select using (attivo or public.is_admin());

create policy "corsi_admin_scrittura" on public.corsi
  for all using (public.is_admin()) with check (public.is_admin());
