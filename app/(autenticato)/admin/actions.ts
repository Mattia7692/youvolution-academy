"use server";

import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export async function verificaIscrizione(iscrizioneId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase
    .from("iscrizioni")
    .update({
      stato: "verificata",
      verificata_da: admin.id,
      verificata_at: new Date().toISOString(),
      nota_admin: null,
    })
    .eq("id", iscrizioneId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/coda-verifica");
  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// ─── Corsi ──────────────────────────────────────────────────────────────

export type DatiCorso = {
  titolo: string;
  descrizione: string;
  calendario: string;
  metodo_pagamento: "allianz" | "fineco";
  attivo: boolean;
  sold_out_manuale: boolean;
  iscrizioni_chiuse_manuale: boolean;
};

export type DatiModulo = {
  titolo: string;
  descrizione: string;
  imponibile: number;
  scadenza_iscrizione: string; // yyyy-mm-dd
  data_inizio: string; // yyyy-mm-dd
  posti_disponibili: number | null;
  iscrizioni_chiuse: boolean;
};

function validaModulo(dati: DatiModulo): string | null {
  if (!dati.titolo.trim()) return "Il titolo del modulo è obbligatorio.";
  if (!(dati.imponibile >= 0)) return "Imponibile non valido.";
  if (!dati.scadenza_iscrizione || !dati.data_inizio) {
    return "Scadenza iscrizione e data di inizio sono obbligatorie.";
  }
  if (dati.scadenza_iscrizione > dati.data_inizio) {
    return "La scadenza di iscrizione deve precedere (o coincidere con) la data di inizio.";
  }
  if (dati.posti_disponibili !== null && !(dati.posti_disponibili >= 0)) {
    return "Numero di posti non valido.";
  }
  return null;
}

// Crea solo il contenitore: titolo, descrizione, calendario. Nasce sempre
// disattivato, perche' senza almeno un modulo non c'e' nulla da acquistare —
// i moduli (anche un unico modulo, per un corso "semplice") si aggiungono
// dopo dal dettaglio del corso.
export async function creaCorso(
  datiCorso: Pick<DatiCorso, "titolo" | "descrizione" | "calendario" | "metodo_pagamento">,
) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const titolo = datiCorso.titolo.trim();
  if (!titolo) return { ok: false as const, error: "Il titolo è obbligatorio." };

  const { data: corso, error: corsoError } = await supabase
    .from("corsi")
    .insert({
      titolo,
      descrizione: datiCorso.descrizione.trim() || null,
      calendario: datiCorso.calendario.trim() || null,
      metodo_pagamento: datiCorso.metodo_pagamento,
      attivo: false,
    })
    .select("id")
    .single();

  if (corsoError || !corso) {
    return { ok: false as const, error: corsoError?.message ?? "Errore nella creazione del corso." };
  }

  revalidatePath("/admin/corsi");
  revalidatePath("/catalogo");
  return { ok: true as const, corsoId: corso.id as string };
}

export async function aggiornaCorso(corsoId: string, patch: Partial<DatiCorso>) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  // Un corso senza almeno un modulo o pacchetto attivo non ha nulla da
  // vendere: non puo' diventare visibile ai corsisti.
  if (patch.attivo === true) {
    const [{ count: moduliAttivi }, { count: pacchettiAttivi }] = await Promise.all([
      supabase
        .from("moduli_corso")
        .select("id", { count: "exact", head: true })
        .eq("corso_id", corsoId)
        .eq("attivo", true),
      supabase
        .from("pacchetti_corso")
        .select("id", { count: "exact", head: true })
        .eq("corso_id", corsoId)
        .eq("attivo", true),
    ]);

    if (!moduliAttivi && !pacchettiAttivi) {
      return {
        ok: false as const,
        error: "Aggiungi almeno un modulo attivo prima di rendere il corso visibile ai corsisti.",
      };
    }
  }

  const aggiornamento: Record<string, unknown> = {};
  if (patch.titolo !== undefined) aggiornamento.titolo = patch.titolo.trim();
  if (patch.descrizione !== undefined) aggiornamento.descrizione = patch.descrizione.trim() || null;
  if (patch.calendario !== undefined) aggiornamento.calendario = patch.calendario.trim() || null;
  if (patch.metodo_pagamento !== undefined) aggiornamento.metodo_pagamento = patch.metodo_pagamento;
  if (patch.attivo !== undefined) aggiornamento.attivo = patch.attivo;
  if (patch.sold_out_manuale !== undefined) aggiornamento.sold_out_manuale = patch.sold_out_manuale;
  if (patch.iscrizioni_chiuse_manuale !== undefined) {
    aggiornamento.iscrizioni_chiuse_manuale = patch.iscrizioni_chiuse_manuale;
  }

  const { error } = await supabase.from("corsi").update(aggiornamento).eq("id", corsoId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

// Clona corso + moduli + pacchetti (incluso il ponte pacchetto-moduli) cosi'
// com'e', date comprese: il caso d'uso e' la nuova edizione di un corso
// esistente, identica in tutto tranne le date, che l'admin sistema subito
// dopo nella pagina dedicata invece di reinserire tutto da capo. Il nuovo
// corso nasce sempre disattivato, come una creazione normale.
export async function duplicaCorso(corsoId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { data: corso } = await supabase
    .from("corsi")
    .select("titolo, descrizione, calendario, metodo_pagamento")
    .eq("id", corsoId)
    .maybeSingle();

  if (!corso) return { ok: false as const, error: "Corso non trovato." };

  const [{ data: moduli }, { data: pacchetti }] = await Promise.all([
    supabase
      .from("moduli_corso")
      .select(
        "id, titolo, descrizione, ordine, imponibile, scadenza_iscrizione, data_inizio, posti_disponibili, attivo",
      )
      .eq("corso_id", corsoId)
      .order("ordine", { ascending: true }),
    supabase
      .from("pacchetti_corso")
      .select("id, titolo, imponibile, scadenza_iscrizione, posti_disponibili, attivo")
      .eq("corso_id", corsoId),
  ]);

  const { data: nuovoCorso, error: corsoError } = await supabase
    .from("corsi")
    .insert({
      titolo: corso.titolo,
      descrizione: corso.descrizione,
      calendario: corso.calendario,
      metodo_pagamento: corso.metodo_pagamento,
      attivo: false,
    })
    .select("id")
    .single();

  if (corsoError || !nuovoCorso) {
    return { ok: false as const, error: corsoError?.message ?? "Errore nella duplicazione del corso." };
  }

  const mappaModuli = new Map<string, string>();

  if (moduli && moduli.length > 0) {
    const { data: nuoviModuli, error: moduliError } = await supabase
      .from("moduli_corso")
      .insert(
        moduli.map((m) => ({
          corso_id: nuovoCorso.id,
          titolo: m.titolo,
          descrizione: m.descrizione,
          ordine: m.ordine,
          imponibile: m.imponibile,
          scadenza_iscrizione: m.scadenza_iscrizione,
          data_inizio: m.data_inizio,
          posti_disponibili: m.posti_disponibili,
          iscrizioni_chiuse: false,
          attivo: m.attivo,
        })),
      )
      .select("id");

    if (moduliError || !nuoviModuli) {
      await supabase.from("corsi").delete().eq("id", nuovoCorso.id);
      return { ok: false as const, error: moduliError?.message ?? "Errore nella duplicazione dei moduli." };
    }
    // L'insert multi-riga di Postgres restituisce le righe nello stesso
    // ordine dei valori inviati: l'abbinamento per indice e' affidabile.
    moduli.forEach((m, i) => mappaModuli.set(m.id, nuoviModuli[i].id));
  }

  if (pacchetti && pacchetti.length > 0) {
    const { data: nuoviPacchetti, error: pacchettiError } = await supabase
      .from("pacchetti_corso")
      .insert(
        pacchetti.map((p) => ({
          corso_id: nuovoCorso.id,
          titolo: p.titolo,
          imponibile: p.imponibile,
          scadenza_iscrizione: p.scadenza_iscrizione,
          posti_disponibili: p.posti_disponibili,
          iscrizioni_chiuse: false,
          attivo: p.attivo,
        })),
      )
      .select("id");

    if (pacchettiError || !nuoviPacchetti) {
      await supabase.from("corsi").delete().eq("id", nuovoCorso.id);
      return { ok: false as const, error: pacchettiError?.message ?? "Errore nella duplicazione dei pacchetti." };
    }

    const mappaPacchetti = new Map<string, string>();
    pacchetti.forEach((p, i) => mappaPacchetti.set(p.id, nuoviPacchetti[i].id));

    const { data: vecchiPonti } = await supabase
      .from("pacchetto_moduli")
      .select("pacchetto_id, modulo_id")
      .in(
        "pacchetto_id",
        pacchetti.map((p) => p.id),
      );

    const nuoviPonti = (vecchiPonti ?? [])
      .map((ponte) => ({
        pacchetto_id: mappaPacchetti.get(ponte.pacchetto_id),
        modulo_id: mappaModuli.get(ponte.modulo_id),
      }))
      .filter((p): p is { pacchetto_id: string; modulo_id: string } => !!p.pacchetto_id && !!p.modulo_id);

    if (nuoviPonti.length > 0) {
      await supabase.from("pacchetto_moduli").insert(nuoviPonti);
    }
  }

  revalidatePath("/admin/corsi");
  return { ok: true as const, corsoId: nuovoCorso.id as string };
}

// Aggiornamento mirato delle sole date, per la pagina "nuova edizione": un
// modulo/pacchetto alla volta sarebbe troppo lento per il caso d'uso (decine
// di date da sistemare in un colpo solo dopo una duplicazione).
export async function aggiornaDateNuovaEdizione(
  corsoId: string,
  dati: {
    calendario: string;
    moduli: { id: string; scadenza_iscrizione: string; data_inizio: string }[];
    pacchetti: { id: string; scadenza_iscrizione: string }[];
  },
) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  for (const m of dati.moduli) {
    if (!m.scadenza_iscrizione || !m.data_inizio) {
      return { ok: false as const, error: "Compila tutte le date dei moduli." };
    }
    if (m.scadenza_iscrizione > m.data_inizio) {
      return {
        ok: false as const,
        error: "In ogni modulo la scadenza iscrizione deve precedere (o coincidere con) la data di inizio.",
      };
    }
  }
  for (const p of dati.pacchetti) {
    if (!p.scadenza_iscrizione) {
      return { ok: false as const, error: "Compila tutte le date dei pacchetti." };
    }
  }

  const risultati = await Promise.all([
    supabase
      .from("corsi")
      .update({ calendario: dati.calendario.trim() || null })
      .eq("id", corsoId),
    ...dati.moduli.map((m) =>
      supabase
        .from("moduli_corso")
        .update({ scadenza_iscrizione: m.scadenza_iscrizione, data_inizio: m.data_inizio })
        .eq("id", m.id),
    ),
    ...dati.pacchetti.map((p) =>
      supabase.from("pacchetti_corso").update({ scadenza_iscrizione: p.scadenza_iscrizione }).eq("id", p.id),
    ),
  ]);

  const fallito = risultati.find((r) => r.error);
  if (fallito?.error) return { ok: false as const, error: fallito.error.message };

  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

export async function eliminaCorso(corsoId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase.from("corsi").delete().eq("id", corsoId);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false as const,
        error:
          "Non puoi eliminare questo corso: ci sono moduli, pacchetti o iscrizioni collegate (anche storiche). Disattivalo invece.",
      };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/corsi");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

// ─── Moduli ─────────────────────────────────────────────────────────────

export async function creaModulo(corsoId: string, dati: DatiModulo) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const errore = validaModulo(dati);
  if (errore) return { ok: false as const, error: errore };

  const { error } = await supabase.from("moduli_corso").insert({
    corso_id: corsoId,
    titolo: dati.titolo.trim(),
    descrizione: dati.descrizione.trim() || null,
    imponibile: dati.imponibile,
    scadenza_iscrizione: dati.scadenza_iscrizione,
    data_inizio: dati.data_inizio,
    posti_disponibili: dati.posti_disponibili,
    iscrizioni_chiuse: dati.iscrizioni_chiuse,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

export async function aggiornaModulo(moduloId: string, patch: Partial<DatiModulo> & { attivo?: boolean }) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const aggiornamento: Record<string, unknown> = {};
  if (patch.titolo !== undefined) aggiornamento.titolo = patch.titolo.trim();
  if (patch.descrizione !== undefined) aggiornamento.descrizione = patch.descrizione.trim() || null;
  if (patch.imponibile !== undefined) aggiornamento.imponibile = patch.imponibile;
  if (patch.scadenza_iscrizione !== undefined) aggiornamento.scadenza_iscrizione = patch.scadenza_iscrizione;
  if (patch.data_inizio !== undefined) aggiornamento.data_inizio = patch.data_inizio;
  if (patch.posti_disponibili !== undefined) aggiornamento.posti_disponibili = patch.posti_disponibili;
  if (patch.iscrizioni_chiuse !== undefined) aggiornamento.iscrizioni_chiuse = patch.iscrizioni_chiuse;
  if (patch.attivo !== undefined) aggiornamento.attivo = patch.attivo;

  const { error } = await supabase.from("moduli_corso").update(aggiornamento).eq("id", moduloId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

export async function eliminaModulo(moduloId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase.from("moduli_corso").delete().eq("id", moduloId);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false as const,
        error: "Non puoi eliminare questo modulo: è incluso in un pacchetto o ha iscrizioni collegate. Disattivalo invece.",
      };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

// ─── Pacchetti ──────────────────────────────────────────────────────────

export type DatiPacchetto = {
  titolo: string;
  imponibile: number;
  scadenza_iscrizione: string;
  posti_disponibili: number | null;
  iscrizioni_chiuse: boolean;
  moduloIds: string[];
};

function validaPacchetto(dati: DatiPacchetto): string | null {
  if (!dati.titolo.trim()) return "Il titolo del pacchetto è obbligatorio.";
  if (!(dati.imponibile >= 0)) return "Imponibile non valido.";
  if (!dati.scadenza_iscrizione) {
    return "La scadenza di iscrizione è obbligatoria.";
  }
  if (dati.posti_disponibili !== null && !(dati.posti_disponibili >= 0)) {
    return "Numero di posti non valido.";
  }
  if (dati.moduloIds.length < 2) {
    return "Un pacchetto deve includere almeno due moduli.";
  }
  return null;
}

export async function creaPacchetto(corsoId: string, dati: DatiPacchetto) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const errore = validaPacchetto(dati);
  if (errore) return { ok: false as const, error: errore };

  const { data: pacchetto, error } = await supabase
    .from("pacchetti_corso")
    .insert({
      corso_id: corsoId,
      titolo: dati.titolo.trim(),
      imponibile: dati.imponibile,
      scadenza_iscrizione: dati.scadenza_iscrizione,
      posti_disponibili: dati.posti_disponibili,
      iscrizioni_chiuse: dati.iscrizioni_chiuse,
    })
    .select("id")
    .single();

  if (error || !pacchetto) {
    return { ok: false as const, error: error?.message ?? "Errore nella creazione del pacchetto." };
  }

  const { error: ponteError } = await supabase
    .from("pacchetto_moduli")
    .insert(dati.moduloIds.map((moduloId) => ({ pacchetto_id: pacchetto.id, modulo_id: moduloId })));

  if (ponteError) {
    await supabase.from("pacchetti_corso").delete().eq("id", pacchetto.id);
    return { ok: false as const, error: ponteError.message };
  }

  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

export async function aggiornaPacchetto(
  pacchettoId: string,
  patch: Partial<Omit<DatiPacchetto, "moduloIds">> & { attivo?: boolean; moduloIds?: string[] },
) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const aggiornamento: Record<string, unknown> = {};
  if (patch.titolo !== undefined) aggiornamento.titolo = patch.titolo.trim();
  if (patch.imponibile !== undefined) aggiornamento.imponibile = patch.imponibile;
  if (patch.scadenza_iscrizione !== undefined) aggiornamento.scadenza_iscrizione = patch.scadenza_iscrizione;
  if (patch.posti_disponibili !== undefined) aggiornamento.posti_disponibili = patch.posti_disponibili;
  if (patch.iscrizioni_chiuse !== undefined) aggiornamento.iscrizioni_chiuse = patch.iscrizioni_chiuse;
  if (patch.attivo !== undefined) aggiornamento.attivo = patch.attivo;

  if (Object.keys(aggiornamento).length > 0) {
    const { error } = await supabase.from("pacchetti_corso").update(aggiornamento).eq("id", pacchettoId);
    if (error) return { ok: false as const, error: error.message };
  }

  if (patch.moduloIds !== undefined) {
    await supabase.from("pacchetto_moduli").delete().eq("pacchetto_id", pacchettoId);
    if (patch.moduloIds.length > 0) {
      const { error: ponteError } = await supabase
        .from("pacchetto_moduli")
        .insert(patch.moduloIds.map((moduloId) => ({ pacchetto_id: pacchettoId, modulo_id: moduloId })));
      if (ponteError) return { ok: false as const, error: ponteError.message };
    }
  }

  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

export async function eliminaPacchetto(pacchettoId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase.from("pacchetti_corso").delete().eq("id", pacchettoId);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false as const,
        error: "Non puoi eliminare questo pacchetto: ha iscrizioni collegate. Disattivalo invece.",
      };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/catalogo");
  return { ok: true as const };
}

// ─── Codici sconto ──────────────────────────────────────────────────────

export type DatiCodiceSconto = {
  codice: string;
  percentuale: number;
  corsoId: string | null;
  validoDa: string | null;
  validoA: string | null;
  attivo: boolean;
};

export async function creaCodiceSconto(dati: DatiCodiceSconto) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const codice = dati.codice.trim().toUpperCase();
  if (!codice) return { ok: false as const, error: "Il codice è obbligatorio." };
  if (!(dati.percentuale > 0 && dati.percentuale <= 100)) {
    return { ok: false as const, error: "Percentuale non valida." };
  }

  const { error } = await supabase.from("codici_sconto").insert({
    codice,
    percentuale: dati.percentuale,
    corso_id: dati.corsoId,
    valido_da: dati.validoDa,
    valido_a: dati.validoA,
    attivo: dati.attivo,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Esiste già un codice sconto con questo nome." };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/codici-sconto");
  return { ok: true as const };
}

export async function aggiornaCodiceSconto(id: string, patch: Partial<DatiCodiceSconto>) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const aggiornamento: Record<string, unknown> = {};
  if (patch.codice !== undefined) aggiornamento.codice = patch.codice.trim().toUpperCase();
  if (patch.percentuale !== undefined) aggiornamento.percentuale = patch.percentuale;
  if (patch.corsoId !== undefined) aggiornamento.corso_id = patch.corsoId;
  if (patch.validoDa !== undefined) aggiornamento.valido_da = patch.validoDa;
  if (patch.validoA !== undefined) aggiornamento.valido_a = patch.validoA;
  if (patch.attivo !== undefined) aggiornamento.attivo = patch.attivo;

  const { error } = await supabase.from("codici_sconto").update(aggiornamento).eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/codici-sconto");
  return { ok: true as const };
}

export async function eliminaCodiceSconto(id: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase.from("codici_sconto").delete().eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/codici-sconto");
  return { ok: true as const };
}

// ─── Iscrizioni ─────────────────────────────────────────────────────────

export async function eliminaIscrizione(iscrizioneId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase.from("iscrizioni").delete().eq("id", iscrizioneId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/admin/coda-verifica");
  revalidatePath("/admin/prenotazioni");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function segnalaIscrizione(iscrizioneId: string, nota: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const notaPulita = nota.trim();
  if (!notaPulita) {
    return { ok: false as const, error: "Indica il motivo della segnalazione." };
  }

  const { error } = await supabase
    .from("iscrizioni")
    .update({
      stato: "cro_da_chiarire",
      verificata_da: admin.id,
      verificata_at: new Date().toISOString(),
      nota_admin: notaPulita,
    })
    .eq("id", iscrizioneId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/coda-verifica");
  revalidatePath("/admin/corsi", "layout");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
