-- Supporto per corsi importati da fonti esterne, in attesa di revisione admin:
-- il prezzo non e' noto al momento dell'import (lo imposta l'admin durante la
-- revisione), e serve un posto per il calendario/date, troppo eterogeneo tra
-- corsi (range singoli, moduli su piu' mesi, "su richiesta") per un campo date
-- rigido.
alter table public.corsi alter column prezzo drop not null;
alter table public.corsi add column calendario text;
