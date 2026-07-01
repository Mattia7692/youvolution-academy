-- Profiles: 1:1 with auth.users. Holds registration data, role, and GDPR consent.
create extension if not exists citext;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  cognome text not null,
  email citext not null unique,
  ruolo text not null default 'corsista' check (ruolo in ('corsista', 'admin')),
  consenso_data timestamptz not null,
  consenso_versione text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER helper so RLS policies (and other tables' policies) can check
-- the caller's role without recursively hitting profiles' own RLS.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and ruolo = 'admin'
  );
$$;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Blocks role escalation: changing `ruolo` requires the caller to already be an
-- admin. Ordinary app traffic runs as the `authenticated` Postgres role via
-- PostgREST; direct SQL access (service_role, e.g. via the Supabase MCP or a
-- one-off bootstrap script) is the only way to create the very first admin,
-- mirroring the bootstrap gap noted in the enterprise platform.
create function public.blocca_cambio_ruolo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ruolo is distinct from old.ruolo then
    if coalesce(auth.role(), 'service_role') <> 'service_role' and not public.is_admin() then
      raise exception 'Solo un admin puo modificare il ruolo di un utente';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_blocca_cambio_ruolo
  before update on public.profiles
  for each row execute function public.blocca_cambio_ruolo();

-- Auto-creates a profile row on sign-up. `ruolo` is always forced to 'corsista' —
-- any client-supplied role in user metadata is ignored, so admin can never be
-- self-assigned at registration.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, cognome, email, ruolo, consenso_data, consenso_versione)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'cognome', ''),
    new.email,
    'corsista',
    coalesce((new.raw_user_meta_data ->> 'consenso_data')::timestamptz, now()),
    coalesce(new.raw_user_meta_data ->> 'consenso_versione', 'v1')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
