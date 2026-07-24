-- Sconto alumni FUTURE: automatico per chi ha gia' un'iscrizione verificata
-- (pagamento confermato) su un corso DIVERSO da quello che sta acquistando
-- ora, risalente ad almeno 6 mesi prima. Le due condizioni insieme evitano
-- sia il caso "modulo 1 oggi, sconto sui moduli successivi dello stesso
-- corso" (un corso puo' durare piu' di 6 mesi, quindi il solo tempo non
-- basterebbe) sia gli abusi last-minute (pagare un modulo economico di un
-- altro corso solo per sbloccare lo sconto il giorno dopo). Esclusivo con
-- early bird e codice sconto, come gli altri: si applica sempre il migliore
-- tra quelli attivi, mai cumulati.
alter table public.iscrizioni drop constraint iscrizioni_sconto_tipo_check;

alter table public.iscrizioni add constraint iscrizioni_sconto_tipo_check
  check (sconto_tipo in ('nessuno', 'early_bird', 'codice', 'alumni'));
