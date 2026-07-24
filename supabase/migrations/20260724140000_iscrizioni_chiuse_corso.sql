-- Flag manuale "iscrizioni chiuse" a livello di corso, stesso pattern di
-- sold_out_manuale: l'admin puo' chiuderle a mano indipendentemente dalle
-- scadenze dei singoli moduli/pacchetti. Lo stato automatico invece non si
-- salva: si deriva a runtime confrontando scadenza_iscrizione di
-- moduli/pacchetti attivi con la data odierna.
alter table public.corsi add column iscrizioni_chiuse_manuale boolean not null default false;
