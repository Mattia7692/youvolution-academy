-- Alcuni corsi (es. Core Coaching) hanno gia' un prezzo alumni incorporato
-- nella loro struttura tariffaria, diverso dal 15% universale applicato
-- automaticamente altrove: per questi corsi lo sconto automatico va escluso,
-- altrimenti si sommerebbe/confliggerebbe con lo sconto gia' previsto nei
-- pacchetti del corso stesso.
alter table public.corsi add column sconto_alumni_escluso boolean not null default false;
