"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { scomponiPrezzo } from "@/lib/prezzo";
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

// Un pacchetto e moduli indipendenti (non inclusi nel pacchetto, es. il
// Modulo 1 di Professional Coach venduto a se' rispetto al pacchetto
// "Moduli II-VII") si possono acquistare insieme nella stessa iscrizione:
// pacchettoId e moduloIds non sono piu' mutuamente esclusivi.
export type SelezioneCorso = {
  pacchettoId: string | null;
  moduloIds: string[];
};

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
    .select("id, attivo, early_bird_scadenza, early_bird_percentuale, first_mover_scadenza, first_mover_percentuale")
    .eq("id", corsoId)
    .maybeSingle();

  if (corsoError || !corso || !corso.attivo) {
    return { ok: false as const, error: "Corso non disponibile." };
  }

  const oggi = new Date().toISOString().slice(0, 10);

  const { pacchettoId, moduloIds: moduloIdsIndipendenti } = dati.selezione;

  if (!pacchettoId && moduloIdsIndipendenti.length === 0) {
    return { ok: false as const, error: "Seleziona almeno un modulo." };
  }

  let imponibile = 0;
  const moduloIdsFinali = new Set<string>();
  let pacchettoIdFinale: string | null = null;

  if (pacchettoId) {
    const { data: pacchetto } = await supabase
      .from("pacchetti_corso")
      .select("id, corso_id, imponibile, scadenza_iscrizione, posti_disponibili, iscrizioni_chiuse, attivo")
      .eq("id", pacchettoId)
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

    imponibile += pacchetto.imponibile;
    pacchettoIdFinale = pacchetto.id;

    const { data: moduliInclusi } = await supabase
      .from("pacchetto_moduli")
      .select("modulo_id")
      .eq("pacchetto_id", pacchetto.id);
    for (const m of moduliInclusi ?? []) moduloIdsFinali.add(m.modulo_id);
  }

  // Moduli indipendenti: acquistati a se', in aggiunta a un eventuale
  // pacchetto (es. Modulo 1 di Professional Coach insieme al pacchetto
  // "Moduli II-VII"). Chi e' gia' incluso nel pacchetto non va ri-validato
  // ne' ri-sommato qui.
  const moduloIdsDaValidare = moduloIdsIndipendenti.filter((id) => !moduloIdsFinali.has(id));

  if (moduloIdsDaValidare.length > 0) {
    const { data: moduli } = await supabase
      .from("moduli_corso")
      .select("id, corso_id, imponibile, scadenza_iscrizione, posti_disponibili, iscrizioni_chiuse, attivo")
      .in("id", moduloIdsDaValidare);

    if (
      !moduli ||
      moduli.length !== moduloIdsDaValidare.length ||
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

    imponibile += moduli.reduce((somma, m) => somma + m.imponibile, 0);
    for (const id of moduloIdsDaValidare) moduloIdsFinali.add(id);
  }

  // Mai fidarsi della selezione mandata dal client: un modulo gia' coperto da
  // un'iscrizione bloccante (in verifica, verificata, o con un piano rate
  // personalizzato ancora in corso) di questo stesso utente per questo corso
  // non e' ri-acquistabile, anche se lato UI non dovrebbe mai arrivare
  // selezionato.
  const { data: candidateBloccanti } = await supabase
    .from("iscrizioni")
    .select("id, stato, pacchetto_id")
    .eq("corsista_id", user.id)
    .eq("corso_id", corsoId)
    .in("stato", ["in_attesa_pagamento", "cro_inserito", "cro_da_chiarire", "verificata"]);

  const inAttesaCandidateIds = (candidateBloccanti ?? [])
    .filter((i) => i.stato === "in_attesa_pagamento")
    .map((i) => i.id);
  let idsConPianoRate = new Set<string>();
  if (inAttesaCandidateIds.length > 0) {
    const { data: rateEsistenti } = await supabase
      .from("iscrizioni_rate")
      .select("iscrizione_id")
      .in("iscrizione_id", inAttesaCandidateIds);
    idsConPianoRate = new Set((rateEsistenti ?? []).map((r) => r.iscrizione_id));
  }

  const iscrizioniBloccanti = (candidateBloccanti ?? []).filter(
    (i) => i.stato !== "in_attesa_pagamento" || idsConPianoRate.has(i.id),
  );

  if (iscrizioniBloccanti.length > 0) {
    const idsBloccanti = iscrizioniBloccanti.map((i) => i.id);
    const { data: moduliGiaCoperti } = await supabase
      .from("iscrizione_moduli")
      .select("modulo_id")
      .in("iscrizione_id", idsBloccanti);
    const copertiSet = new Set((moduliGiaCoperti ?? []).map((m) => m.modulo_id));

    const pacchettiCoperti = iscrizioniBloccanti
      .map((i) => i.pacchetto_id)
      .filter((id): id is string => !!id);
    if (pacchettiCoperti.length > 0) {
      const { data: moduliDaPacchetti } = await supabase
        .from("pacchetto_moduli")
        .select("modulo_id")
        .in("pacchetto_id", pacchettiCoperti);
      for (const m of moduliDaPacchetti ?? []) copertiSet.add(m.modulo_id);
    }

    if ([...moduloIdsFinali].some((id) => copertiSet.has(id))) {
      return { ok: false as const, error: "Sei già iscritto a uno o più dei moduli selezionati." };
    }
  }

  // Sconto non cumulabile: un codice valido ha sempre priorita', altrimenti
  // vale la finestra automatica piu' vantaggiosa/temporalmente prima
  // (first mover prima di early bird), mai insieme.
  let scontoTipo: "nessuno" | "early_bird" | "first_mover" | "codice" = "nessuno";
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
  } else if (corso.first_mover_scadenza && oggi <= corso.first_mover_scadenza) {
    scontoTipo = "first_mover";
    scontoPercentuale = corso.first_mover_percentuale!;
  } else if (corso.early_bird_scadenza && oggi <= corso.early_bird_scadenza) {
    scontoTipo = "early_bird";
    scontoPercentuale = corso.early_bird_percentuale!;
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

  // Sincronizza i dati anagrafici/fiscali su "Il mio account", cosi' chi li
  // compila qui per la prima volta (senza essere mai passato da /account) non
  // deve reinserirli alla prossima iscrizione. Solo i dati fiscali "propri":
  // la fatturazione a soggetto diverso resta specifica di questa iscrizione,
  // non va imposta come default per acquisti futuri. Best-effort: un
  // eventuale errore qui non deve far fallire un'iscrizione gia' salvata.
  await supabase
    .from("profiles")
    .update({
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
    })
    .eq("id", user.id);

  await supabase.from("iscrizione_moduli").delete().eq("iscrizione_id", iscrizione.id);
  const { error: moduliError } = await supabase
    .from("iscrizione_moduli")
    .insert(
      Array.from(moduloIdsFinali).map((moduloId) => ({ iscrizione_id: iscrizione.id, modulo_id: moduloId })),
    );

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

// Equivalente di salvaPasso2, ma per una singola rata di un piano di
// pagamento personalizzato (iscrizioni_rate) invece dell'unico CRO di
// iscrizioni. iscrizioni_rate non ha corsista_id proprio: la proprietà si
// verifica tramite l'iscrizione madre, sia qui (difesa in profondità) sia
// nella RLS (iscrizioni_rate_update_own_o_admin).
export async function salvaRataCro(
  rataId: string,
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

  const { data: rata } = await supabase
    .from("iscrizioni_rate")
    .select("id, stato, iscrizioni!inner(corsista_id, ragione_sociale, codice_fiscale)")
    .eq("id", rataId)
    .maybeSingle();

  const iscrizione = rata
    ? Array.isArray(rata.iscrizioni)
      ? rata.iscrizioni[0]
      : rata.iscrizioni
    : null;

  if (!rata || !iscrizione || iscrizione.corsista_id !== user.id) {
    return { ok: false as const, error: "Rata non trovata." };
  }
  if (rata.stato !== "in_attesa_pagamento") {
    return { ok: false as const, error: "Questa rata non è più modificabile." };
  }
  if (!iscrizione.ragione_sociale || !iscrizione.codice_fiscale) {
    return { ok: false as const, error: "Completa prima i tuoi dati anagrafici/fiscali." };
  }

  const { error } = await supabase
    .from("iscrizioni_rate")
    .update({
      cro,
      cro_inserito_at: new Date().toISOString(),
      bonifico_data: dati.data,
      bonifico_banca_ordinante: bancaOrdinante,
      bonifico_ammontare: ammontare,
      stato: "cro_inserito",
    })
    .eq("id", rataId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/le-mie-iscrizioni");
  revalidatePath("/admin/coda-verifica");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// Le iscrizioni personalizzate (admin/actions.ts, creaIscrizionePersonalizzata)
// non raccolgono i dati anagrafici/fiscali: li recuperano da un'iscrizione
// precedente del corsista, se esiste, altrimenti restano vuoti e li completa
// qui il corsista stesso. guardia_iscrizioni blocca comunque questo update
// una volta che l'iscrizione e' 'verificata', quindi la finestra utile e'
// naturalmente quella in cui il pagamento e' ancora in corso.
export async function completaDatiIscrizione(iscrizioneId: string, fiscali: DatiFiscali) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato." };

  const { error } = await supabase
    .from("iscrizioni")
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
    })
    .eq("id", iscrizioneId)
    .eq("corsista_id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  // Stessa sincronizzazione di salvaPasso1: i dati valgono anche per "Il mio
  // account", non solo per questa iscrizione.
  await supabase
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
    })
    .eq("id", user.id);

  revalidatePath("/le-mie-iscrizioni");
  return { ok: true as const };
}
