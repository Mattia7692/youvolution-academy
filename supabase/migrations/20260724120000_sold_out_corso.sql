-- Flag manuale "sold out": l'admin puo' forzarla indipendentemente dalla
-- capienza effettiva dei moduli/pacchetti (es. per sospendere le vendite).
-- Lo stato "sold out automatico" invece non si salva: si deriva a runtime
-- confrontando posti_disponibili e posti occupati di moduli/pacchetti attivi
-- (stesse funzioni gia' usate per il controllo di capienza al Passo 1).
alter table public.corsi add column sold_out_manuale boolean not null default false;
