-- Descrizione facoltativa per singolo modulo: alcuni corsi hanno un
-- programma diverso per modulo, che nel form di iscrizione va mostrato sotto
-- il titolo del modulo, non compresso nella descrizione unica del corso.
alter table public.moduli_corso add column descrizione text;
