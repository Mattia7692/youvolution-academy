-- Limite di utilizzi per codice sconto: un codice ora puo' avere un tetto al
-- numero di iscrizioni che possono usarlo. max_utilizzi null = illimitato
-- (comportamento storico, invariato per i codici gia' esistenti: nessun
-- backfill).
--
-- "Utilizzo" = iscrizione verificata (pagamento confermato dall'admin): e' il
-- solo stato che conta nel resto della piattaforma. Un'iscrizione mai pagata
-- non brucia il codice; un'iscrizione verificata poi eliminata lo libera. Il
-- conteggio e' sempre derivato (da iscrizioni.codice_sconto_inserito), mai un
-- contatore memorizzato che potrebbe andare in drift.
alter table public.codici_sconto
  add column max_utilizzi integer
  check (max_utilizzi is null or max_utilizzi >= 1);

-- valida_codice_sconto() resta invariata come firma (ritorna la sola
-- percentuale) ma ora tratta "esaurito" come "non valido": qualunque
-- consumatore semplice smette di applicare lo sconto al raggiungimento del
-- tetto, senza dover conoscere il nuovo campo.
create or replace function public.valida_codice_sconto(p_codice text, p_corso_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select c.percentuale
  from public.codici_sconto c
  where upper(c.codice) = upper(trim(p_codice))
    and c.attivo
    and (c.corso_id is null or c.corso_id = p_corso_id)
    and (c.valido_da is null or c.valido_da <= current_date)
    and (c.valido_a is null or c.valido_a >= current_date)
    and (
      c.max_utilizzi is null
      or c.max_utilizzi > (
        select count(*)
        from public.iscrizioni i
        where upper(i.codice_sconto_inserito) = upper(trim(p_codice))
          and i.stato = 'verificata'
      )
    )
  limit 1;
$$;

-- Versione ricca per il form di iscrizione e la server action salvaPasso1:
-- distingue "codice inesistente/scaduto/disattivato" (nessuna riga) da
-- "codice valido ma esaurito", e riporta utilizzi correnti / tetto per i
-- messaggi. Stesso pattern security definer di valida_codice_sconto()
-- (eseguibile lato client in fase di iscrizione, la tabella resta non
-- leggibile via REST da un corsista).
create function public.verifica_codice_sconto(p_codice text, p_corso_id uuid)
returns table (percentuale numeric, esaurito boolean, utilizzi integer, max_utilizzi integer)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select *
    from public.codici_sconto
    where upper(codice) = upper(trim(p_codice))
      and attivo
      and (corso_id is null or corso_id = p_corso_id)
      and (valido_da is null or valido_da <= current_date)
      and (valido_a is null or valido_a >= current_date)
    limit 1
  ),
  u as (
    select count(*)::integer as n
    from public.iscrizioni
    where upper(codice_sconto_inserito) = upper(trim(p_codice))
      and stato = 'verificata'
  )
  select
    c.percentuale,
    c.max_utilizzi is not null and u.n >= c.max_utilizzi,
    u.n,
    c.max_utilizzi
  from c cross join u;
$$;

-- Per la pagina admin "Codici sconto" (utilizzi residui tipo "3/5") il
-- conteggio si fa direttamente dalla pagina: is_admin() vede tutte le
-- iscrizioni via RLS, non serve una funzione dedicata.
