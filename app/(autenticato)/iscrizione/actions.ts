"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DatiFiscali = {
  tipo_soggetto: "privato" | "azienda";
  ragione_sociale: string;
  codice_fiscale: string;
  partita_iva: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  nazione: string;
  codice_sdi: string;
  pec: string;
};

// Modulo 1: crea (o riprende) l'iscrizione per il corso, salva i dati fiscali
// e congela il prezzo corrente del corso. Porta lo stato a in_attesa_pagamento.
export async function salvaModulo1(corsoId: string, dati: DatiFiscali) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato." };

  const { data: corso, error: corsoError } = await supabase
    .from("corsi")
    .select("id, prezzo, attivo")
    .eq("id", corsoId)
    .maybeSingle();

  if (corsoError || !corso || !corso.attivo) {
    return { ok: false as const, error: "Corso non disponibile." };
  }

  const { data: esistente } = await supabase
    .from("iscrizioni")
    .select("id, stato")
    .eq("corsista_id", user.id)
    .eq("corso_id", corsoId)
    .in("stato", ["bozza", "in_attesa_pagamento"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    ...dati,
    prezzo_snapshot: corso.prezzo,
    stato: "in_attesa_pagamento" as const,
  };

  const { data: iscrizione, error } = esistente
    ? await supabase
        .from("iscrizioni")
        .update(payload)
        .eq("id", esistente.id)
        .select("id")
        .single()
    : await supabase
        .from("iscrizioni")
        .insert({ corsista_id: user.id, corso_id: corsoId, ...payload })
        .select("id")
        .single();

  if (error || !iscrizione) {
    return { ok: false as const, error: error?.message ?? "Errore nel salvataggio." };
  }

  revalidatePath("/le-mie-iscrizioni");
  return { ok: true as const, iscrizioneId: iscrizione.id as string };
}

// Modulo 2: registra il CRO del bonifico. Il pagamento resta esterno alla
// piattaforma — qui si registra solo il riferimento.
export async function salvaModulo2(iscrizioneId: string, cro: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato." };

  const croPulito = cro.trim();
  if (!croPulito) {
    return { ok: false as const, error: "Il CRO è obbligatorio." };
  }

  const { error } = await supabase
    .from("iscrizioni")
    .update({
      cro: croPulito,
      cro_inserito_at: new Date().toISOString(),
      stato: "cro_inserito",
    })
    .eq("id", iscrizioneId)
    .eq("corsista_id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/le-mie-iscrizioni");
  return { ok: true as const };
}
