"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { EARLY_BIRD_PERCENTUALE, scadenzaEarlyBird, scomponiPrezzo } from "@/lib/prezzo";
import {
  CONSENSO_CONDIZIONI_ISCRIZIONE_VERSIONE_CORRENTE,
  CONSENSO_PRIVACY_ISCRIZIONE_VERSIONE_CORRENTE,
} from "@/lib/consenso";

export type DatiFiscali = {
  tipo_soggetto: "privato" | "azienda" | "libero_professionista";
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
  cellulare: string;
  data_nascita: string;
};

export type DatiFatturazione = {
  diversa: boolean;
  intestazione: string;
  indirizzo: string;
  cap: string;
  codice_fiscale_piva: string;
  codice_sdi: string;
};

export type SelezioneCorso =
  | { tipo: "moduli"; moduloIds: string[] }
  | { tipo: "pacchetto"; pacchettoId: string };

export type DatiPasso1 = {
  selezione: SelezioneCorso;
  fiscali: DatiFiscali;
  fatturazione: DatiFatturazione;
  codiceSconto: string;
  consensoCondizioni: boolean;
  consensoPrivacy: boolean;
};

// Passo 1: crea (o riprende) l'iscrizione per il corso, valida la selezione
// di moduli/pacchetto lato server (mai fidarsi del prezzo calcolato dal
// client), applica al massimo uno sconto (early bird automatico oppure
// codice, mai insieme) e congela imponibile/totale. Porta lo stato a
// in_attesa_pagamento.
export async function salvaPasso1(corsoId: string, dati: DatiPasso1) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato." };

  if (!dati.consensoCondizioni || !dati.consensoPrivacy) {
    return { ok: false as const, error: "Devi accettare entrambi i consensi per proseguire." };
  }

  const { data: corso, error: corsoError } = await supabase
    .from("corsi")
    .select("id, attivo")
    .eq("id", corsoId)
    .maybeSingle();

  if (corsoError || !corso || !corso.attivo) {
    return { ok: false as const, error: "Corso non disponibile." };
  }

  const oggi = new Date().toISOString().slice(0, 10);

  // L'early bird e' derivato a livello di intero corso — 16 giorni prima
  // della data di inizio del suo primo modulo — non dipende da quali moduli
  // il corsista sceglie di acquistare in questa iscrizione.
  const { data: tuttiModuli } = await supabase
    .from("moduli_corso")
    .select("data_inizio")
    .eq("corso_id", corsoId)
    .eq("attivo", true);
  const cutoffEarlyBird = scadenzaEarlyBird((tuttiModuli ?? []).map((m) => m.data_inizio));

  let imponibile = 0;
  let moduloIdsFinali: string[] = [];
  let pacchettoIdFinale: string | null = null;

  if (dati.selezione.tipo === "pacchetto") {
    const { data: pacchetto } = await supabase
      .from("pacchetti_corso")
      .select("id, corso_id, imponibile, scadenza_iscrizione, posti_disponibili, iscrizioni_chiuse, attivo")
      .eq("id", dati.selezione.pacchettoId)
      .maybeSingle();

    if (!pacchetto || pacchetto.corso_id !== corsoId || !pacchetto.attivo) {
      return { ok: false as const, error: "Pacchetto non disponibile." };
    }
    if (pacchetto.iscrizioni_chiuse) {
      return { ok: false as const, error: "Le iscrizioni a questo pacchetto sono chiuse." };
    }
    if (pacchetto.scadenza_iscrizione < oggi) {
      return { ok: false as const, error: "La scadenza di iscrizione per questo pacchetto è passata." };
    }
    if (pacchetto.posti_disponibili !== null) {
      const { data: occupati } = await supabase.rpc("posti_occupati_pacchetto", {
        p_pacchetto_id: pacchetto.id,
      });
      if ((occupati ?? 0) >= pacchetto.posti_disponibili) {
        return { ok: false as const, error: "Posti esauriti per questo pacchetto." };
      }
    }

    imponibile = pacchetto.imponibile;
    pacchettoIdFinale = pacchetto.id;

    const { data: moduliInclusi } = await supabase
      .from("pacchetto_moduli")
      .select("modulo_id")
      .eq("pacchetto_id", pacchetto.id);
    moduloIdsFinali = (moduliInclusi ?? []).map((m) => m.modulo_id);
  } else {
    const moduloIds = dati.selezione.moduloIds;
    if (moduloIds.length === 0) {
      return { ok: false as const, error: "Seleziona almeno un modulo." };
    }

    const { data: moduli } = await supabase
      .from("moduli_corso")
      .select("id, corso_id, imponibile, scadenza_iscrizione, posti_disponibili, iscrizioni_chiuse, attivo")
      .in("id", moduloIds);

    if (
      !moduli ||
      moduli.length !== moduloIds.length ||
      moduli.some((m) => m.corso_id !== corsoId || !m.attivo)
    ) {
      return { ok: false as const, error: "Selezione moduli non valida." };
    }
    if (moduli.some((m) => m.iscrizioni_chiuse)) {
      return { ok: false as const, error: "Le iscrizioni a uno dei moduli selezionati sono chiuse." };
    }
    if (moduli.some((m) => m.scadenza_iscrizione < oggi)) {
      return {
        ok: false as const,
        error: "La scadenza di iscrizione per uno dei moduli selezionati è passata.",
      };
    }

    for (const modulo of moduli) {
      if (modulo.posti_disponibili !== null) {
        const { data: occupati } = await supabase.rpc("posti_occupati_modulo", {
          p_modulo_id: modulo.id,
        });
        if ((occupati ?? 0) >= modulo.posti_disponibili) {
          return { ok: false as const, error: "Posti esauriti per uno dei moduli selezionati." };
        }
      }
    }

    imponibile = moduli.reduce((somma, m) => somma + m.imponibile, 0);
    moduloIdsFinali = moduloIds;
  }

  // Sconto non cumulabile: un codice valido sostituisce l'early bird
  // automatico, non si sommano mai.
  let scontoTipo: "nessuno" | "early_bird" | "codice" = "nessuno";
  let scontoPercentuale = 0;
  const codiceInserito = dati.codiceSconto.trim();

  if (codiceInserito) {
    const { data: percentuale } = await supabase.rpc("valida_codice_sconto", {
      p_codice: codiceInserito,
      p_corso_id: corsoId,
    });
    if (!percentuale) {
      return { ok: false as const, error: "Codice sconto non valido o scaduto." };
    }
    scontoTipo = "codice";
    scontoPercentuale = percentuale;
  } else if (cutoffEarlyBird && oggi <= cutoffEarlyBird) {
    scontoTipo = "early_bird";
    scontoPercentuale = EARLY_BIRD_PERCENTUALE;
  }

  const { totale } = scomponiPrezzo(imponibile, scontoPercentuale);

  const { data: esistente } = await supabase
    .from("iscrizioni")
    .select("id")
    .eq("corsista_id", user.id)
    .eq("corso_id", corsoId)
    .in("stato", ["bozza", "in_attesa_pagamento"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ora = new Date().toISOString();

  const payload = {
    tipo_soggetto: dati.fiscali.tipo_soggetto,
    ragione_sociale: dati.fiscali.ragione_sociale,
    codice_fiscale: dati.fiscali.codice_fiscale,
    partita_iva: dati.fiscali.partita_iva,
    indirizzo: dati.fiscali.indirizzo,
    cap: dati.fiscali.cap,
    citta: dati.fiscali.citta,
    provincia: dati.fiscali.provincia,
    nazione: dati.fiscali.nazione,
    codice_sdi: dati.fiscali.codice_sdi,
    pec: dati.fiscali.pec,
    cellulare: dati.fiscali.cellulare,
    data_nascita: dati.fiscali.data_nascita || null,

    fatturazione_diversa: dati.fatturazione.diversa,
    fatturazione_intestazione: dati.fatturazione.diversa ? dati.fatturazione.intestazione : null,
    fatturazione_indirizzo: dati.fatturazione.diversa ? dati.fatturazione.indirizzo : null,
    fatturazione_cap: dati.fatturazione.diversa ? dati.fatturazione.cap : null,
    fatturazione_codice_fiscale_piva: dati.fatturazione.diversa ? dati.fatturazione.codice_fiscale_piva : null,
    fatturazione_codice_sdi: dati.fatturazione.diversa ? dati.fatturazione.codice_sdi : null,

    pacchetto_id: pacchettoIdFinale,
    sconto_tipo: scontoTipo,
    sconto_percentuale: scontoPercentuale,
    codice_sconto_inserito: scontoTipo === "codice" ? codiceInserito.toUpperCase() : null,

    imponibile_snapshot: imponibile,
    totale_snapshot: totale,

    consenso_condizioni_accettato: true,
    consenso_condizioni_data: ora,
    consenso_condizioni_versione: CONSENSO_CONDIZIONI_ISCRIZIONE_VERSIONE_CORRENTE,
    consenso_privacy_accettato: true,
    consenso_privacy_data: ora,
    consenso_privacy_versione: CONSENSO_PRIVACY_ISCRIZIONE_VERSIONE_CORRENTE,

    stato: "in_attesa_pagamento" as const,
  };

  const { data: iscrizione, error } = esistente
    ? await supabase.from("iscrizioni").update(payload).eq("id", esistente.id).select("id").single()
    : await supabase
        .from("iscrizioni")
        .insert({ corsista_id: user.id, corso_id: corsoId, ...payload })
        .select("id")
        .single();

  if (error || !iscrizione) {
    return { ok: false as const, error: error?.message ?? "Errore nel salvataggio." };
  }

  await supabase.from("iscrizione_moduli").delete().eq("iscrizione_id", iscrizione.id);
  const { error: moduliError } = await supabase
    .from("iscrizione_moduli")
    .insert(moduloIdsFinali.map((moduloId) => ({ iscrizione_id: iscrizione.id, modulo_id: moduloId })));

  if (moduliError) {
    return { ok: false as const, error: moduliError.message };
  }

  // Il corsista vede subito la propria iscrizione, e l'admin deve vedere la
  // nuova prenotazione (pagina + contatore in sidebar) senza dover forzare un
  // refresh: la router cache di Next.js altrimenti continuerebbe a servire la
  // versione vuota vista prima di questa iscrizione.
  revalidatePath("/le-mie-iscrizioni");
  revalidatePath("/admin/prenotazioni");
  revalidatePath("/admin/coda-verifica");
  revalidatePath("/", "layout");
  return { ok: true as const, iscrizioneId: iscrizione.id as string };
}

// Passo 2: registra gli estremi del bonifico. Il pagamento resta esterno alla
// piattaforma — qui si registrano solo i riferimenti per la riconciliazione.
export async function salvaPasso2(
  iscrizioneId: string,
  dati: { cro: string; data: string; bancaOrdinante: string; ammontare: string },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato." };

  const cro = dati.cro.trim();
  const bancaOrdinante = dati.bancaOrdinante.trim();
  if (!cro) return { ok: false as const, error: "Il CRO è obbligatorio." };
  if (!dati.data) return { ok: false as const, error: "La data del bonifico è obbligatoria." };
  if (!bancaOrdinante) return { ok: false as const, error: "La banca ordinante è obbligatoria." };
  const ammontare = Number(dati.ammontare);
  if (!(ammontare > 0)) return { ok: false as const, error: "Indica l'ammontare del bonifico." };

  const { error } = await supabase
    .from("iscrizioni")
    .update({
      cro,
      cro_inserito_at: new Date().toISOString(),
      bonifico_data: dati.data,
      bonifico_banca_ordinante: bancaOrdinante,
      bonifico_ammontare: ammontare,
      stato: "cro_inserito",
    })
    .eq("id", iscrizioneId)
    .eq("corsista_id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  // Passa da "prenotazione" a "coda di verifica": entrambe le viste admin
  // (oltre al contatore in sidebar) vanno invalidate.
  revalidatePath("/le-mie-iscrizioni");
  revalidatePath("/admin/prenotazioni");
  revalidatePath("/admin/coda-verifica");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
