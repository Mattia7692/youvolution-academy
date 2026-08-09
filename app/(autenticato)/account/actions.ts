"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DatiFatturazione, DatiFiscali } from "@/app/(autenticato)/iscrizione/actions";

// Dati anagrafici/fiscali e fatturazione a soggetto diverso dell'account
// (profiles), distinti dagli snapshot congelati su ogni singola
// iscrizioni.* — vedi supabase/migrations/20260809100200_dati_fiscali_profilo.sql
// e 20260809100300_fatturazione_profilo.sql.
export async function aggiornaDatiAccount(fiscali: DatiFiscali, fatturazione: DatiFatturazione) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato." };

  const { error } = await supabase
    .from("profiles")
    .update({
      tipo_soggetto: fiscali.tipo_soggetto,
      ragione_sociale: fiscali.ragione_sociale,
      codice_fiscale: fiscali.codice_fiscale,
      partita_iva: fiscali.partita_iva,
      indirizzo: fiscali.indirizzo,
      cap: fiscali.cap,
      citta: fiscali.citta,
      provincia: fiscali.provincia,
      nazione: fiscali.nazione,
      codice_sdi: fiscali.codice_sdi,
      pec: fiscali.pec,
      cellulare: fiscali.cellulare,
      data_nascita: fiscali.data_nascita || null,

      fatturazione_diversa: fatturazione.diversa,
      fatturazione_intestazione: fatturazione.diversa ? fatturazione.intestazione : null,
      fatturazione_indirizzo: fatturazione.diversa ? fatturazione.indirizzo : null,
      fatturazione_cap: fatturazione.diversa ? fatturazione.cap : null,
      fatturazione_codice_fiscale_piva: fatturazione.diversa ? fatturazione.codice_fiscale_piva : null,
      fatturazione_codice_sdi: fatturazione.diversa ? fatturazione.codice_sdi : null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/account");
  return { ok: true as const };
}
