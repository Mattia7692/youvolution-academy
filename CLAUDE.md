# Youvolution Academy

## Supabase: permessi sulle tabelle nuove (dal 30 ottobre 2026)

Dal 30 ottobre 2026 Supabase non dà più in automatico l'accesso alla Data API alle tabelle nuove dello schema `public`. Senza un `grant` esplicito l'API risponde «permission denied».

- **Ogni `create table` in `public` ha i suoi `grant` nella stessa migrazione** (o nello stesso comando, se la tabella si crea a mano dall'editor SQL):
  ```sql
  grant select on public.nome_tabella to anon;
  grant select, insert, update, delete on public.nome_tabella to authenticated;
  grant select, insert, update, delete on public.nome_tabella to service_role;
  ```
  Restringere i permessi se la tabella non deve essere scrivibile da tutti (la sicurezza vera resta nelle policy RLS).
- Vale anche quando si ricrea il database (`supabase db reset`, nuovo progetto, ramo di anteprima): tutte le tabelle sono «nuove».
- Prima di dire «fatto» su una migrazione con tabelle nuove, controllare che i `grant` ci siano.
