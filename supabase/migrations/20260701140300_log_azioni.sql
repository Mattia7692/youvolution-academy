-- Log azioni: audit trail append-only. Nessun grant di insert diretto — si scrive
-- solo tramite la funzione SECURITY DEFINER log_azione(), cosi' ne' un corsista
-- ne' l'automazione possono falsificare il log.
create table public.log_azioni (
  id uuid primary key default gen_random_uuid(),
  attore_id uuid references public.profiles (id),
  tipo_attore text not null check (tipo_attore in ('umano', 'automazione')),
  azione text not null,
  iscrizione_id uuid references public.iscrizioni (id),
  dettagli jsonb,
  created_at timestamptz not null default now()
);

alter table public.log_azioni enable row level security;

create policy "log_azioni_select_admin" on public.log_azioni
  for select using (public.is_admin());

create function public.log_azione(
  p_azione text,
  p_iscrizione_id uuid default null,
  p_dettagli jsonb default null,
  p_tipo_attore text default 'umano'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.log_azioni (attore_id, tipo_attore, azione, iscrizione_id, dettagli)
  values (
    case when p_tipo_attore = 'umano' then auth.uid() else null end,
    p_tipo_attore,
    p_azione,
    p_iscrizione_id,
    p_dettagli
  );
end;
$$;

-- Registra automaticamente ogni cambio di stato di un'iscrizione (creazione inclusa),
-- cosi' l'app non deve ricordarsi di chiamare log_azione() ad ogni transizione.
create function public.log_cambio_stato_iscrizione()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.stato is distinct from old.stato then
    perform public.log_azione(
      'iscrizione_stato_' || new.stato,
      new.id,
      jsonb_build_object(
        'stato_precedente', case when tg_op = 'UPDATE' then old.stato else null end,
        'stato_nuovo', new.stato
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_log_cambio_stato_iscrizione
  after insert or update on public.iscrizioni
  for each row execute function public.log_cambio_stato_iscrizione();
