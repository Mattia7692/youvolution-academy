"use server";

import { createClient } from "@/lib/supabase/server";
import { richiediAdmin, richiediOwner } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import type { DatiFiscali } from "@/app/(autenticato)/iscrizione/actions";
import { getResend, MITTENTE_ACADEMY } from "@/lib/resend";
import { ALIQUOTA_IVA } from "@/lib/prezzo";
import {
  CONSENSO_CONDIZIONI_ISCRIZIONE_VERSIONE_CORRENTE,
  CONSENSO_PRIVACY_ISCRIZIONE_VERSIONE_CORRENTE,
} from "@/lib/consenso";

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
  early_bird_scadenza: string | null; // yyyy-mm-dd, null = nessun early bird
  early_bird_percentuale: number | null;
  first_mover_scadenza: string | null; // yyyy-mm-dd, null = nessun first mover
  first_mover_percentuale: number | null;
};

function validaEarlyBird(scadenza: string | null, percentuale: number | null): string | null {
  if ((scadenza === null) !== (percentuale === null)) {
    return "Per l'early bird servono sia la scadenza che la percentuale, oppure nessuna delle due.";
  }
  if (percentuale !== null && !(percentuale > 0 && percentuale <= 100)) {
    return "La percentuale early bird deve essere tra 0 e 100.";
  }
  return null;
}

function validaFirstMover(scadenza: string | null, percentuale: number | null): string | null {
  if ((scadenza === null) !== (percentuale === null)) {
    return "Per il first mover servono sia la scadenza che la percentuale, oppure nessuna delle due.";
  }
  if (percentuale !== null && !(percentuale > 0 && percentuale <= 100)) {
    return "La percentuale first mover deve essere tra 0 e 100.";
  }
  return null;
}

export type DatiModulo = {
  titolo: string;
  descrizione: string;
  imponibile: number;
  scadenza_iscrizione: string; // yyyy-mm-dd
  data_inizio: string; // yyyy-mm-dd
  posti_disponibili: number | null;
  iscrizioni_chiuse: boolean;
  acquistabile: boolean;
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
  datiCorso: Pick<
    DatiCorso,
    | "titolo"
    | "descrizione"
    | "calendario"
    | "metodo_pagamento"
    | "early_bird_scadenza"
    | "early_bird_percentuale"
    | "first_mover_scadenza"
    | "first_mover_percentuale"
  >,
) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const titolo = datiCorso.titolo.trim();
  if (!titolo) return { ok: false as const, error: "Il titolo è obbligatorio." };

  const erroreFirstMover = validaFirstMover(datiCorso.first_mover_scadenza, datiCorso.first_mover_percentuale);
  if (erroreFirstMover) return { ok: false as const, error: erroreFirstMover };

  const erroreEarlyBird = validaEarlyBird(datiCorso.early_bird_scadenza, datiCorso.early_bird_percentuale);
  if (erroreEarlyBird) return { ok: false as const, error: erroreEarlyBird };

  const { data: corso, error: corsoError } = await supabase
    .from("corsi")
    .insert({
      titolo,
      descrizione: datiCorso.descrizione.trim() || null,
      calendario: datiCorso.calendario.trim() || null,
      metodo_pagamento: datiCorso.metodo_pagamento,
      early_bird_scadenza: datiCorso.early_bird_scadenza,
      early_bird_percentuale: datiCorso.early_bird_percentuale,
      first_mover_scadenza: datiCorso.first_mover_scadenza,
      first_mover_percentuale: datiCorso.first_mover_percentuale,
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

  if (patch.first_mover_scadenza !== undefined || patch.first_mover_percentuale !== undefined) {
    const erroreFirstMover = validaFirstMover(
      patch.first_mover_scadenza ?? null,
      patch.first_mover_percentuale ?? null,
    );
    if (erroreFirstMover) return { ok: false as const, error: erroreFirstMover };
  }

  if (patch.early_bird_scadenza !== undefined || patch.early_bird_percentuale !== undefined) {
    const erroreEarlyBird = validaEarlyBird(
      patch.early_bird_scadenza ?? null,
      patch.early_bird_percentuale ?? null,
    );
    if (erroreEarlyBird) return { ok: false as const, error: erroreEarlyBird };
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
  if (patch.early_bird_scadenza !== undefined) aggiornamento.early_bird_scadenza = patch.early_bird_scadenza;
  if (patch.early_bird_percentuale !== undefined) {
    aggiornamento.early_bird_percentuale = patch.early_bird_percentuale;
  }
  if (patch.first_mover_scadenza !== undefined) aggiornamento.first_mover_scadenza = patch.first_mover_scadenza;
  if (patch.first_mover_percentuale !== undefined) {
    aggiornamento.first_mover_percentuale = patch.first_mover_percentuale;
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
    .select(
      "titolo, descrizione, calendario, metodo_pagamento, early_bird_scadenza, early_bird_percentuale, first_mover_scadenza, first_mover_percentuale",
    )
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
      early_bird_scadenza: corso.early_bird_scadenza,
      early_bird_percentuale: corso.early_bird_percentuale,
      first_mover_scadenza: corso.first_mover_scadenza,
      first_mover_percentuale: corso.first_mover_percentuale,
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
    earlyBirdScadenza?: string | null;
    firstMoverScadenza?: string | null;
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
  if (dati.earlyBirdScadenza !== undefined && !dati.earlyBirdScadenza) {
    return { ok: false as const, error: "Compila la scadenza dell'early bird." };
  }
  if (dati.firstMoverScadenza !== undefined && !dati.firstMoverScadenza) {
    return { ok: false as const, error: "Compila la scadenza del first mover." };
  }

  const aggiornamentoCorso: Record<string, unknown> = { calendario: dati.calendario.trim() || null };
  if (dati.earlyBirdScadenza !== undefined) aggiornamentoCorso.early_bird_scadenza = dati.earlyBirdScadenza;
  if (dati.firstMoverScadenza !== undefined) aggiornamentoCorso.first_mover_scadenza = dati.firstMoverScadenza;

  const risultati = await Promise.all([
    supabase.from("corsi").update(aggiornamentoCorso).eq("id", corsoId),
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
    acquistabile: dati.acquistabile,
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
  if (patch.acquistabile !== undefined) aggiornamento.acquistabile = patch.acquistabile;
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

// ─── Webinar di completamento modulo ───────────────────────────────────

export type DatiWebinar = {
  titolo: string;
  inizio: string; // ISO datetime, es. da <input type="datetime-local">
  fine: string; // ISO datetime
};

function validaWebinar(dati: DatiWebinar): string | null {
  if (!dati.titolo.trim()) return "Il titolo del webinar è obbligatorio.";
  if (!dati.inizio || !dati.fine) return "Data/ora di inizio e fine sono obbligatorie.";
  if (dati.fine <= dati.inizio) return "L'orario di fine deve essere successivo a quello di inizio.";
  return null;
}

export async function creaWebinar(moduloId: string, dati: DatiWebinar) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const errore = validaWebinar(dati);
  if (errore) return { ok: false as const, error: errore };

  const { error } = await supabase.from("webinar_modulo").insert({
    modulo_id: moduloId,
    titolo: dati.titolo.trim(),
    inizio: dati.inizio,
    fine: dati.fine,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi", "layout");
  return { ok: true as const };
}

export async function aggiornaWebinar(webinarId: string, patch: Partial<DatiWebinar>) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const aggiornamento: Record<string, unknown> = {};
  if (patch.titolo !== undefined) aggiornamento.titolo = patch.titolo.trim();
  if (patch.inizio !== undefined) aggiornamento.inizio = patch.inizio;
  if (patch.fine !== undefined) aggiornamento.fine = patch.fine;

  const { error } = await supabase.from("webinar_modulo").update(aggiornamento).eq("id", webinarId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi", "layout");
  return { ok: true as const };
}

export async function eliminaWebinar(webinarId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase.from("webinar_modulo").delete().eq("id", webinarId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/corsi", "layout");
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

// Scorciatoia dalla coda di verifica: chi ha comprato il Modulo 1 in first
// mover deve poter completare il resto del corso a prezzo agevolato. Il
// codice e' unico per corso (non per iscrizione/utente, la tabella non lo
// permette) e viene creato una sola volta: click successivi per altri
// first mover dello stesso corso riusano lo stesso codice, inviato via
// email a ciascuno. Se l'invio fallisce ma il codice esiste gia' (o e'
// stato appena creato), lo restituiamo comunque cosi' l'admin puo' copiarlo
// e comunicarlo a mano.
export async function inviaCodiceFirstMover(iscrizioneId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { data: iscrizione } = await supabase
    .from("iscrizioni")
    .select("corso_id, corsista_id, sconto_tipo")
    .eq("id", iscrizioneId)
    .maybeSingle();

  if (!iscrizione) return { ok: false as const, error: "Iscrizione non trovata." };
  if (iscrizione.sconto_tipo !== "first_mover") {
    return { ok: false as const, error: "Questa iscrizione non ha uno sconto first mover." };
  }

  const [{ data: corsista }, { data: corso }] = await Promise.all([
    supabase.from("profiles").select("nome, email").eq("id", iscrizione.corsista_id).maybeSingle(),
    supabase.from("corsi").select("titolo, first_mover_percentuale").eq("id", iscrizione.corso_id).maybeSingle(),
  ]);

  if (!corsista?.email) return { ok: false as const, error: "Email del corsista non trovata." };
  if (!corso?.first_mover_percentuale) {
    return { ok: false as const, error: "Questo corso non ha uno sconto first mover configurato." };
  }

  const { data: esistente } = await supabase
    .from("codici_sconto")
    .select("codice")
    .eq("corso_id", iscrizione.corso_id)
    .like("codice", "FIRSTMOVER-%")
    .maybeSingle();

  let codice = esistente?.codice as string | undefined;

  if (!codice) {
    codice = `FIRSTMOVER-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const { error: erroreInsert } = await supabase.from("codici_sconto").insert({
      codice,
      percentuale: corso.first_mover_percentuale,
      corso_id: iscrizione.corso_id,
    });
    if (erroreInsert) return { ok: false as const, error: erroreInsert.message };
    revalidatePath("/admin/codici-sconto");
  }

  const { error: erroreEmail } = await getResend().emails.send({
    from: MITTENTE_ACADEMY,
    to: corsista.email,
    subject: `Il tuo codice sconto per completare ${corso.titolo}`,
    html: `<p>Ciao ${corsista.nome ?? ""},</p>
<p>Come da offerta first mover, ecco il codice sconto per completare l'iscrizione a <strong>${corso.titolo}</strong> con uno sconto del ${corso.first_mover_percentuale}%:</p>
<p style="font-size:1.4em;font-weight:bold;letter-spacing:1px;">${codice}</p>
<p>Inseriscilo nel campo "Codice sconto" al Passo 1 dell'iscrizione.</p>`,
  });

  if (erroreEmail) {
    return {
      ok: false as const,
      error: `Codice pronto ma invio email fallito: ${erroreEmail.message}`,
      codice,
    };
  }

  return { ok: true as const, codice, email: corsista.email };
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

// ─── Utenti ─────────────────────────────────────────────────────────────

// Chiunque si registri diventa 'corsista' di default (vedi trigger
// handle_new_user): qui l'admin promuove un corsista ad admin, o retrocede
// un admin a corsista. Il trigger blocca_cambio_ruolo in DB rifiuta questo
// update se il chiamante non e' admin, difesa in profondita' oltre a questo
// controllo applicativo.
export async function cambiaRuoloUtente(profiloId: string, ruolo: "corsista" | "admin" | "owner") {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  if (profiloId === admin.id) {
    return { ok: false as const, error: "Non puoi cambiare il tuo stesso ruolo." };
  }

  // Assegnare o revocare owner richiede essere owner: questo controllo
  // duplica la guardia gia' presente nel database (trigger
  // blocca_cambio_ruolo), che resta l'unica barriera non aggirabile — qui
  // serve solo per mostrare un errore leggibile invece del messaggio SQL.
  const { data: target } = await supabase
    .from("profiles")
    .select("ruolo")
    .eq("id", profiloId)
    .maybeSingle();

  if (target?.ruolo === "owner" || ruolo === "owner") {
    const owner = await richiediOwner(supabase);
    if (!owner) return { ok: false as const, error: "Solo un owner può assegnare o revocare il ruolo owner." };
  }

  const { error } = await supabase.from("profiles").update({ ruolo }).eq("id", profiloId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/utenti");
  revalidatePath(`/admin/utenti/${profiloId}`);
  return { ok: true as const };
}

// ─── Iscrizioni personalizzate ─────────────────────────────────────────
//
// Per accordi commerciali negoziati caso per caso (N rate, importi liberi):
// l'admin crea l'iscrizione da zero per conto del corsista, bypassando
// passo-1/passo-2. I consensi (condizioni/privacy) sono raccolti fuori
// piattaforma (email/contratto) e attestati qui dall'admin — non c'e' un
// secondo flusso corsista-facing solo per questo caso raro. Il pagamento
// viene tracciato in iscrizioni_rate (vedi verificaRata/segnalaRata) invece
// che con il singolo CRO di iscrizioni.

export type RataPersonalizzata = { importo: number; scadenza: string | null };

export async function creaIscrizionePersonalizzata(dati: {
  corsistaId: string;
  corsoId: string;
  moduloIds: string[];
  rate: RataPersonalizzata[];
}) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  if (dati.moduloIds.length === 0) {
    return { ok: false as const, error: "Seleziona almeno un modulo." };
  }
  if (dati.rate.length === 0) {
    return { ok: false as const, error: "Aggiungi almeno una rata." };
  }
  if (dati.rate.some((r) => !(r.importo > 0))) {
    return { ok: false as const, error: "Ogni rata deve avere un importo positivo." };
  }

  const { data: corso } = await supabase.from("corsi").select("id").eq("id", dati.corsoId).maybeSingle();
  if (!corso) return { ok: false as const, error: "Corso non disponibile." };

  // I dati anagrafici/fiscali e la fatturazione a soggetto diverso non li
  // inserisce l'admin: si recuperano dall'account del corsista ("Il mio
  // account"). Se il corsista non li ha ancora compilati restano vuoti e
  // sara' lui a completarli da "Le mie iscrizioni" (vedi
  // completaDatiIscrizione in iscrizione/actions.ts).
  const { data: corsista } = await supabase
    .from("profiles")
    .select(
      "id, tipo_soggetto, ragione_sociale, codice_fiscale, partita_iva, indirizzo, cap, citta, provincia, nazione, codice_sdi, pec, cellulare, data_nascita, fatturazione_diversa, fatturazione_intestazione, fatturazione_indirizzo, fatturazione_cap, fatturazione_codice_fiscale_piva, fatturazione_codice_sdi",
    )
    .eq("id", dati.corsistaId)
    .maybeSingle();
  if (!corsista) return { ok: false as const, error: "Corsista non valido." };

  const totale = dati.rate.reduce((somma, r) => somma + r.importo, 0);
  const imponibile = totale / (1 + ALIQUOTA_IVA / 100);
  const ora = new Date().toISOString();

  const { data: iscrizione, error } = await supabase
    .from("iscrizioni")
    .insert({
      corsista_id: dati.corsistaId,
      corso_id: dati.corsoId,

      tipo_soggetto: corsista.tipo_soggetto,
      ragione_sociale: corsista.ragione_sociale,
      codice_fiscale: corsista.codice_fiscale,
      partita_iva: corsista.partita_iva,
      indirizzo: corsista.indirizzo,
      cap: corsista.cap,
      citta: corsista.citta,
      provincia: corsista.provincia,
      nazione: corsista.nazione,
      codice_sdi: corsista.codice_sdi,
      pec: corsista.pec,
      cellulare: corsista.cellulare,
      data_nascita: corsista.data_nascita,

      fatturazione_diversa: corsista.fatturazione_diversa,
      fatturazione_intestazione: corsista.fatturazione_diversa ? corsista.fatturazione_intestazione : null,
      fatturazione_indirizzo: corsista.fatturazione_diversa ? corsista.fatturazione_indirizzo : null,
      fatturazione_cap: corsista.fatturazione_diversa ? corsista.fatturazione_cap : null,
      fatturazione_codice_fiscale_piva: corsista.fatturazione_diversa
        ? corsista.fatturazione_codice_fiscale_piva
        : null,
      fatturazione_codice_sdi: corsista.fatturazione_diversa ? corsista.fatturazione_codice_sdi : null,

      sconto_tipo: "nessuno",
      sconto_percentuale: 0,

      imponibile_snapshot: imponibile,
      totale_snapshot: totale,

      consenso_condizioni_accettato: true,
      consenso_condizioni_data: ora,
      consenso_condizioni_versione: CONSENSO_CONDIZIONI_ISCRIZIONE_VERSIONE_CORRENTE,
      consenso_privacy_accettato: true,
      consenso_privacy_data: ora,
      consenso_privacy_versione: CONSENSO_PRIVACY_ISCRIZIONE_VERSIONE_CORRENTE,

      nota_admin: "Iscrizione personalizzata: consensi raccolti fuori piattaforma dall'admin.",
      stato: "in_attesa_pagamento",
    })
    .select("id")
    .single();

  if (error || !iscrizione) {
    return { ok: false as const, error: error?.message ?? "Errore nel salvataggio." };
  }

  const { error: moduliError } = await supabase
    .from("iscrizione_moduli")
    .insert(dati.moduloIds.map((moduloId) => ({ iscrizione_id: iscrizione.id, modulo_id: moduloId })));

  if (moduliError) return { ok: false as const, error: moduliError.message };

  const { error: rateError } = await supabase.from("iscrizioni_rate").insert(
    dati.rate.map((r, i) => ({
      iscrizione_id: iscrizione.id,
      numero: i + 1,
      importo: r.importo,
      scadenza: r.scadenza,
    })),
  );

  if (rateError) return { ok: false as const, error: rateError.message };

  revalidatePath("/admin/coda-verifica");
  revalidatePath("/admin/iscritti");
  revalidatePath("/le-mie-iscrizioni");
  return { ok: true as const, iscrizioneId: iscrizione.id as string };
}

export async function verificaRata(rataId: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { data: rata, error } = await supabase
    .from("iscrizioni_rate")
    .update({
      stato: "verificata",
      verificata_da: admin.id,
      verificata_at: new Date().toISOString(),
      nota_admin: null,
    })
    .eq("id", rataId)
    .select("iscrizione_id")
    .single();

  if (error || !rata) return { ok: false as const, error: error?.message ?? "Errore nel salvataggio." };

  // Se questa era l'ultima rata ancora da verificare, l'iscrizione madre
  // passa a 'verificata' — stessa mutazione di verificaIscrizione, eseguita
  // qui perche' per un piano a rate lo stato complessivo dipende da tutte le
  // rate, non da un singolo CRO.
  const { data: rateRimanenti } = await supabase
    .from("iscrizioni_rate")
    .select("id")
    .eq("iscrizione_id", rata.iscrizione_id)
    .neq("stato", "verificata");

  if (!rateRimanenti || rateRimanenti.length === 0) {
    await supabase
      .from("iscrizioni")
      .update({
        stato: "verificata",
        verificata_da: admin.id,
        verificata_at: new Date().toISOString(),
        nota_admin: null,
      })
      .eq("id", rata.iscrizione_id);
  }

  revalidatePath("/admin/coda-verifica");
  revalidatePath("/admin/iscritti");
  revalidatePath("/le-mie-iscrizioni");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function segnalaRata(rataId: string, nota: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const notaPulita = nota.trim();
  if (!notaPulita) {
    return { ok: false as const, error: "Indica il motivo della segnalazione." };
  }

  const { error } = await supabase
    .from("iscrizioni_rate")
    .update({
      stato: "cro_da_chiarire",
      verificata_da: admin.id,
      verificata_at: new Date().toISOString(),
      nota_admin: notaPulita,
    })
    .eq("id", rataId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/coda-verifica");
  revalidatePath("/le-mie-iscrizioni");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// ─── Scheda corsista (CRM) ──────────────────────────────────────────────

export type DatiCorsistaAdmin = DatiFiscali & {
  azienda: string;
  ruolo_aziendale: string;
};

// Correzione dei dati anagrafici/fiscali + azienda da parte dell'admin, dalla
// scheda corsista — distinta da aggiornaDatiAccount (self-service, in
// app/(autenticato)/account/actions.ts) perche' qui il chiamante e' l'admin,
// non il proprietario dei dati.
export async function aggiornaDatiCorsista(profiloId: string, dati: DatiCorsistaAdmin) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase
    .from("profiles")
    .update({
      tipo_soggetto: dati.tipo_soggetto,
      ragione_sociale: dati.ragione_sociale || null,
      codice_fiscale: dati.codice_fiscale || null,
      partita_iva: dati.partita_iva || null,
      indirizzo: dati.indirizzo || null,
      cap: dati.cap || null,
      citta: dati.citta || null,
      provincia: dati.provincia || null,
      nazione: dati.nazione || null,
      codice_sdi: dati.codice_sdi || null,
      pec: dati.pec || null,
      cellulare: dati.cellulare || null,
      data_nascita: dati.data_nascita || null,
      azienda: dati.azienda || null,
      ruolo_aziendale: dati.ruolo_aziendale || null,
    })
    .eq("id", profiloId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/utenti/${profiloId}`);
  return { ok: true as const };
}

// Nota interna admin-only sul corsista (tabella profili_note_admin, mai
// esposta al corsista — vedi migration 20260813100200).
export async function salvaNotaAdmin(profiloId: string, nota: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { error } = await supabase
    .from("profili_note_admin")
    .upsert({ profilo_id: profiloId, nota, aggiornata_da: admin.id });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/utenti/${profiloId}`);
  return { ok: true as const };
}

// Segna gestita una richiesta di cancellazione GDPR: la cancellazione vera e
// propria resta un processo manuale fuori piattaforma, qui si traccia solo
// che e' stata presa in carico e con quale esito.
export async function gestisciRichiestaCancellazione(richiestaId: string, notaGestione: string) {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) return { ok: false as const, error: "Non autorizzato." };

  const { data, error } = await supabase
    .from("richieste_cancellazione")
    .update({
      stato: "gestita",
      gestita_da: admin.id,
      gestita_at: new Date().toISOString(),
      nota_gestione: notaGestione.trim() || null,
    })
    .eq("id", richiestaId)
    .select("profilo_id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/utenti/${data.profilo_id}`);
  return { ok: true as const };
}
