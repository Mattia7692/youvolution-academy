-- Aggiunge "libero_professionista" come terza opzione di tipo_soggetto,
-- oltre a "privato" e "azienda".
alter table iscrizioni drop constraint iscrizioni_tipo_soggetto_check;
alter table iscrizioni add constraint iscrizioni_tipo_soggetto_check
  check (tipo_soggetto in ('privato', 'azienda', 'libero_professionista'));
