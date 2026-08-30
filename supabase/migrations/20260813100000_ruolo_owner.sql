-- Ruolo owner: superiore ad admin. Owner eredita tutti i privilegi admin
-- (is_admin() ora copre anche owner), cosi' le policy/funzioni che gia'
-- controllano is_admin() su iscrizioni, iscrizioni_rate, log_azioni, coda
-- verifica ecc. non vanno toccate: un owner ci passa automaticamente.
-- is_owner() e' il controllo piu' stretto, usato solo dove serve distinguere
-- owner da admin semplice (assegnazione/revoca owner, modifica riga owner).
-- Pattern replicato concettualmente da quello gia' in uso nella piattaforma
-- executive (is_admin()/is_owner() + trigger guardia sul cambio ruolo).

alter table public.profiles drop constraint profiles_ruolo_check;
alter table public.profiles add constraint profiles_ruolo_check
  check (ruolo in ('corsista', 'admin', 'owner'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and ruolo in ('admin', 'owner')
  );
$$;

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and ruolo = 'owner'
  );
$$;

-- Guardia estesa rispetto alla versione originale (che bloccava solo il
-- cambio ruolo da parte di un non-admin): aggiunge due barriere non
-- aggirabili dall'app.
-- 1) assegnare o revocare owner richiede is_owner(), non basta is_admin() —
--    un admin semplice non puo' ne' autopromuoversi a owner ne' retrocedere
--    un owner;
-- 2) nessuno puo' modificare il proprio ruolo, nemmeno un owner (finora il
--    self-check viveva solo lato server action in cambiaRuoloUtente, non nel
--    database).
create or replace function public.blocca_cambio_ruolo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ruolo is distinct from old.ruolo then
    if coalesce(auth.role(), 'service_role') <> 'service_role' then
      if not public.is_admin() then
        raise exception 'Solo un admin puo modificare il ruolo di un utente';
      end if;

      if (old.ruolo = 'owner' or new.ruolo = 'owner') and not public.is_owner() then
        raise exception 'Solo un owner puo assegnare o revocare il ruolo owner';
      end if;

      if old.id = auth.uid() then
        raise exception 'Non puoi modificare il tuo stesso ruolo';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Difesa in profondita' oltre al trigger: un admin non-owner non puo'
-- modificare nessun campo (non solo il ruolo) della riga di un owner. Un
-- owner puo' sempre modificare qualunque riga.
drop policy "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update
  using (public.is_owner() or (public.is_admin() and ruolo <> 'owner'))
  with check (public.is_owner() or (public.is_admin() and ruolo <> 'owner'));
