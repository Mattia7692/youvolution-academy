-- Allinea iscrizioni al form cartaceo: moduli scelti (o pacchetto), campi
-- partecipante mancanti, fatturazione a soggetto diverso, sconto (early bird
-- automatico o codice, mai cumulati), prezzo scomposto in imponibile/IVA/
-- totale, estremi bonifico completi, e i due consensi separati (condizioni
-- contrattuali / trattamento dati) al posto dell'unico consenso di
-- registrazione in profiles, che resta un consenso diverso (account, non
-- iscrizione al singolo corso).
alter table public.iscrizioni
  add column pacchetto_id uuid references public.pacchetti_corso (id),
  add column cellulare text,
  add column data_nascita date,

  add column fatturazione_diversa boolean not null default false,
  add column fatturazione_intestazione text,
  add column fatturazione_indirizzo text,
  add column fatturazione_cap text,
  add column fatturazione_codice_fiscale_piva text,
  add column fatturazione_codice_sdi text,

  add column sconto_tipo text check (sconto_tipo in ('nessuno', 'early_bird', 'codice')),
  add column sconto_percentuale numeric(5, 2) not null default 0,
  add column codice_sconto_inserito text,

  add column imponibile_snapshot numeric(10, 2),
  add column totale_snapshot numeric(10, 2),

  add column bonifico_data date,
  add column bonifico_banca_ordinante text,
  add column bonifico_ammontare numeric(10, 2),

  add column consenso_condizioni_accettato boolean not null default false,
  add column consenso_condizioni_data timestamptz,
  add column consenso_condizioni_versione text,
  add column consenso_privacy_accettato boolean not null default false,
  add column consenso_privacy_data timestamptz,
  add column consenso_privacy_versione text;

-- Moduli scelti per questa iscrizione (vuota se acquistato come pacchetto:
-- in quel caso pacchetto_id e' valorizzato e i moduli inclusi si risalgono
-- tramite pacchetto_moduli).
create table public.iscrizione_moduli (
  iscrizione_id uuid not null references public.iscrizioni (id) on delete cascade,
  modulo_id uuid not null references public.moduli_corso (id),
  primary key (iscrizione_id, modulo_id)
);

alter table public.iscrizione_moduli enable row level security;

create policy "iscrizione_moduli_select_own_o_admin" on public.iscrizione_moduli
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.iscrizioni i
      where i.id = iscrizione_moduli.iscrizione_id and i.corsista_id = auth.uid()
    )
  );

create policy "iscrizione_moduli_insert_own" on public.iscrizione_moduli
  for insert with check (
    exists (
      select 1 from public.iscrizioni i
      where i.id = iscrizione_moduli.iscrizione_id and i.corsista_id = auth.uid()
    )
  );

create policy "iscrizione_moduli_delete_own_o_admin" on public.iscrizione_moduli
  for delete using (
    public.is_admin()
    or exists (
      select 1 from public.iscrizioni i
      where i.id = iscrizione_moduli.iscrizione_id and i.corsista_id = auth.uid()
    )
  );
