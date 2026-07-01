-- Il REVOKE ... FROM PUBLIC della migration precedente non bastava: Supabase
-- concede EXECUTE ad anon/authenticated tramite default privileges dedicate,
-- non solo tramite PUBLIC. Va revocato esplicitamente da questi ruoli.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.blocca_cambio_ruolo() from anon, authenticated;
revoke execute on function public.guardia_iscrizioni() from anon, authenticated;
revoke execute on function public.log_cambio_stato_iscrizione() from anon, authenticated;
revoke execute on function public.log_azione(text, uuid, jsonb, text) from anon, authenticated;
revoke execute on function public.get_coda_verifica() from anon, authenticated;

-- is_admin() resta eseguibile da anon/authenticated: e' letto dalle RLS policy
-- di piu' tabelle (valutate con i permessi del ruolo chiamante), quindi deve
-- restare invocabile da entrambi; non espone nulla oltre al proprio ruolo.
