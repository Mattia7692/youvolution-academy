-- Rimuove lo sconto alumni FUTURE automatico: il criterio "ha gia' un corso
-- verificato" si e' rivelato insufficiente (Core Coaching ha un proprio
-- sconto alumni incorporato, diverso e non generalizzabile). Gli sconti
-- alumni si gestiranno caso per caso con codici sconto dedicati, gia'
-- supportati dal sistema esistente.
alter table public.corsi drop column sconto_alumni_escluso;

alter table public.iscrizioni drop constraint iscrizioni_sconto_tipo_check;
alter table public.iscrizioni add constraint iscrizioni_sconto_tipo_check
  check (sconto_tipo in ('nessuno', 'early_bird', 'codice'));
