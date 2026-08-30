"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DatiFatturazione, DatiFiscali } from "@/app/(autenticato)/iscrizione/actions";
import { getResend, MITTENTE_ACADEMY } from "@/lib/resend";

export type DatiAzienda = {
  azienda: string;
  ruolo_aziendale: string;
};

// Dati anagrafici/fiscali, azienda e fatturazione a soggetto diverso
// dell'account (profiles), distinti dagli snapshot congelati su ogni singola
// iscrizioni.* — vedi supabase/migrations/20260809100200_dati_fiscali_profilo.sql,
// 20260809100300_fatturazione_profilo.sql e
// 20260813100200_crm_azienda_note_cancellazione.sql.
export async function aggiornaDatiAccount(
  fiscali: DatiFiscali,
  fatturazione: DatiFatturazione,
  azienda: DatiAzienda,
) {
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

      azienda: azienda.azienda || null,
      ruolo_aziendale: azienda.ruolo_aziendale || null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/account");
  return { ok: true as const };
}

// Esportazione GDPR self-service: raccoglie i dati del corsista (anagrafica/
// fiscali/azienda + storico corsi, aggregato da iscrizioni/iscrizioni_rate
// come per la scheda admin) e li invia come allegato via email — nessun
// download diretto, cosi' il file arriva solo alla casella verificata
// dell'account, non a chiunque abbia la sessione del browser aperta. La nota
// interna dell'admin resta esclusa: non e' mai leggibile dal corsista
// nemmeno qui (vive in profili_note_admin, senza policy di select per il
// proprietario).
export async function richiediEsportazioneDati() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato." };

  const [{ data: profilo }, { data: iscrizioniRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "nome, cognome, email, created_at, tipo_soggetto, ragione_sociale, codice_fiscale, partita_iva, indirizzo, cap, citta, provincia, nazione, codice_sdi, pec, cellulare, data_nascita, azienda, ruolo_aziendale, fatturazione_diversa, fatturazione_intestazione, fatturazione_indirizzo, fatturazione_cap, fatturazione_codice_fiscale_piva, fatturazione_codice_sdi, consenso_data, consenso_versione",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("iscrizioni")
      .select(
        "stato, created_at, verificata_at, totale_snapshot, sconto_tipo, sconto_percentuale, codice_sconto_inserito, corsi(titolo), pacchetti_corso(titolo), iscrizione_moduli(moduli_corso(titolo)), iscrizioni_rate(numero, importo, stato, scadenza)",
      )
      .eq("corsista_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!profilo) return { ok: false as const, error: "Profilo non trovato." };

  const storicoCorsi = (iscrizioniRaw ?? []).map((iscrizione) => {
    const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;
    const pacchetto = Array.isArray(iscrizione.pacchetti_corso)
      ? iscrizione.pacchetti_corso[0]
      : iscrizione.pacchetti_corso;
    const moduli = (iscrizione.iscrizione_moduli ?? [])
      .map((im) => (Array.isArray(im.moduli_corso) ? im.moduli_corso[0] : im.moduli_corso))
      .map((m) => m?.titolo)
      .filter((t): t is string => Boolean(t));

    return {
      corso: corso?.titolo ?? null,
      pacchetto: pacchetto?.titolo ?? null,
      moduli,
      stato: iscrizione.stato,
      iscritto_il: iscrizione.created_at,
      verificata_il: iscrizione.verificata_at,
      totale: iscrizione.totale_snapshot,
      sconto:
        iscrizione.sconto_tipo && iscrizione.sconto_tipo !== "nessuno"
          ? {
              tipo: iscrizione.sconto_tipo,
              percentuale: iscrizione.sconto_percentuale,
              codice: iscrizione.codice_sconto_inserito,
            }
          : null,
      rate: iscrizione.iscrizioni_rate ?? [],
    };
  });

  const contenuto = {
    generato_il: new Date().toISOString(),
    profilo,
    storico_corsi: storicoCorsi,
  };

  try {
    await getResend().emails.send({
      from: MITTENTE_ACADEMY,
      to: profilo.email,
      subject: "I tuoi dati — Youvolution Academy",
      html: "<p>In allegato trovi l'esportazione dei dati collegati al tuo account, come richiesto da \"Il mio account\".</p>",
      attachments: [
        {
          filename: `dati-youvolution-academy-${new Date().toISOString().slice(0, 10)}.json`,
          content: Buffer.from(JSON.stringify(contenuto, null, 2), "utf-8"),
          contentType: "application/json",
        },
      ],
    });
  } catch {
    return { ok: false as const, error: "Errore nell'invio dell'email. Riprova più tardi." };
  }

  return { ok: true as const };
}

// Intake della richiesta di cancellazione GDPR: la cancellazione/
// anonimizzazione effettiva resta un processo manuale dell'admin, fuori
// piattaforma (vedi migration 20260813100200) — qui si registra solo la
// richiesta, che l'admin vede e gestisce dalla scheda del corsista.
export async function richiediCancellazioneAccount(messaggio: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato." };

  const { error } = await supabase
    .from("richieste_cancellazione")
    .insert({ profilo_id: user.id, messaggio: messaggio.trim() || null });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Hai già una richiesta di cancellazione in attesa." };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/account");
  return { ok: true as const };
}
