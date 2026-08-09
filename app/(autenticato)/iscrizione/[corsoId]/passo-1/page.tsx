import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Passo1Form } from "@/components/passo-1-form";
import type { DatiFiscali } from "@/app/(autenticato)/iscrizione/actions";

export default async function Passo1Page({
  params,
}: {
  params: Promise<{ corsoId: string }>;
}) {
  const { corsoId } = await params;
  const supabase = await createClient();

  const { data: corso } = await supabase
    .from("corsi")
    .select(
      "id, titolo, attivo, early_bird_scadenza, early_bird_percentuale, first_mover_scadenza, first_mover_percentuale",
    )
    .eq("id", corsoId)
    .maybeSingle();

  if (!corso || !corso.attivo) {
    notFound();
  }

  // L'iscrizione vive nel database, legata all'account — non alla sessione del
  // browser. Se il corsista ha gia' completato il Passo 1 (su un altro
  // dispositivo, giorni fa, non importa), lo riportiamo dritto al punto dove
  // aveva lasciato, invece di fargli ricompilare i dati fiscali da capo.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // I dati anagrafici/fiscali salvati in "Il mio account" precompilano il
  // form: chi li ha gia' inseriti non deve riscriverli a ogni iscrizione
  // (restano comunque modificabili qui, per questa specifica iscrizione).
  let datiFiscaliIniziali: DatiFiscali | null = null;
  if (user) {
    const { data: profilo } = await supabase
      .from("profiles")
      .select(
        "tipo_soggetto, ragione_sociale, codice_fiscale, partita_iva, indirizzo, cap, citta, provincia, nazione, codice_sdi, pec, cellulare, data_nascita",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profilo) {
      datiFiscaliIniziali = {
        tipo_soggetto: (profilo.tipo_soggetto as DatiFiscali["tipo_soggetto"]) ?? "privato",
        ragione_sociale: profilo.ragione_sociale ?? "",
        codice_fiscale: profilo.codice_fiscale ?? "",
        partita_iva: profilo.partita_iva ?? "",
        indirizzo: profilo.indirizzo ?? "",
        cap: profilo.cap ?? "",
        citta: profilo.citta ?? "",
        provincia: profilo.provincia ?? "",
        nazione: profilo.nazione ?? "IT",
        codice_sdi: profilo.codice_sdi ?? "",
        pec: profilo.pec ?? "",
        cellulare: profilo.cellulare ?? "",
        data_nascita: profilo.data_nascita ?? "",
      };
    }
  }

  let iscrizioniBloccanti: { id: string; pacchetto_id: string | null }[] = [];
  if (user) {
    const { data: iscrizioniEsistenti } = await supabase
      .from("iscrizioni")
      .select("id, stato, pacchetto_id")
      .eq("corsista_id", user.id)
      .eq("corso_id", corsoId);

    const inAttesaIds = (iscrizioniEsistenti ?? [])
      .filter((i) => i.stato === "in_attesa_pagamento")
      .map((i) => i.id);

    // Un'iscrizione con piano di pagamento personalizzato (iscrizioni_rate,
    // creata dall'admin) resta 'in_attesa_pagamento' per tutta la durata del
    // piano, non solo mentre il carrello e' aperto: non va confusa con un
    // normale carrello da riprendere a passo-2.
    let idsConPianoRate = new Set<string>();
    if (inAttesaIds.length > 0) {
      const { data: rateEsistenti } = await supabase
        .from("iscrizioni_rate")
        .select("iscrizione_id")
        .in("iscrizione_id", inAttesaIds);
      idsConPianoRate = new Set((rateEsistenti ?? []).map((r) => r.iscrizione_id));
    }

    if (inAttesaIds.some((id) => !idsConPianoRate.has(id))) {
      redirect(`/iscrizione/${corsoId}/passo-2`);
    }

    // "Bloccanti" = occupano moduli in modo definitivo o in verifica: non si
    // possono ri-acquistare gli stessi moduli, ma un'iscrizione puo' coprire
    // solo un sottoinsieme dei moduli del corso, quindi non basta che ne
    // esista una per considerare il corsista "sistemato" su tutto il corso.
    iscrizioniBloccanti = (iscrizioniEsistenti ?? []).filter(
      (i) =>
        ["cro_inserito", "cro_da_chiarire", "verificata"].includes(i.stato) ||
        (i.stato === "in_attesa_pagamento" && idsConPianoRate.has(i.id)),
    );
  }

  const [{ data: moduli }, { data: pacchetti }, { data: pacchettoModuli }] = await Promise.all([
    supabase
      .from("moduli_corso")
      .select("id, titolo, descrizione, imponibile, scadenza_iscrizione, data_inizio, acquistabile")
      .eq("corso_id", corsoId)
      .eq("attivo", true)
      .order("ordine", { ascending: true }),
    supabase
      .from("pacchetti_corso")
      .select("id, titolo, imponibile, scadenza_iscrizione")
      .eq("corso_id", corsoId)
      .eq("attivo", true),
    supabase.from("pacchetto_moduli").select("pacchetto_id, modulo_id"),
  ]);

  const moduliIdsPerPacchetto = new Map<string, string[]>();
  for (const riga of pacchettoModuli ?? []) {
    const lista = moduliIdsPerPacchetto.get(riga.pacchetto_id) ?? [];
    lista.push(riga.modulo_id);
    moduliIdsPerPacchetto.set(riga.pacchetto_id, lista);
  }

  if (!moduli || moduli.length === 0) {
    notFound();
  }

  const moduliCopertiIds = new Set<string>();
  if (iscrizioniBloccanti.length > 0) {
    const { data: righeCoperte } = await supabase
      .from("iscrizione_moduli")
      .select("modulo_id")
      .in(
        "iscrizione_id",
        iscrizioniBloccanti.map((i) => i.id),
      );
    for (const r of righeCoperte ?? []) moduliCopertiIds.add(r.modulo_id);
    for (const i of iscrizioniBloccanti) {
      if (!i.pacchetto_id) continue;
      for (const moduloId of moduliIdsPerPacchetto.get(i.pacchetto_id) ?? []) {
        moduliCopertiIds.add(moduloId);
      }
    }
  }

  if (moduli.every((m) => moduliCopertiIds.has(m.id))) {
    redirect("/le-mie-iscrizioni");
  }

  // Comprare un pacchetto quando una parte dei suoi moduli e' gia' coperta
  // non ha senso (nessuna logica di sconto "parziale"): lo nascondiamo invece
  // di riproporlo.
  const pacchettiConModuli = (pacchetti ?? [])
    .map((p) => ({
      ...p,
      moduloIds: moduliIdsPerPacchetto.get(p.id) ?? [],
    }))
    .filter((p) => !p.moduloIds.some((id) => moduliCopertiIds.has(id)));

  const moduliIds = moduli.map((m) => m.id);
  const { data: webinarRows } =
    moduliIds.length > 0
      ? await supabase
          .from("webinar_modulo")
          .select("id, modulo_id, titolo, inizio, fine")
          .in("modulo_id", moduliIds)
          .order("ordine", { ascending: true })
      : { data: [] };

  const webinarPerModulo = new Map<string, { id: string; titolo: string; inizio: string; fine: string }[]>();
  for (const w of webinarRows ?? []) {
    const lista = webinarPerModulo.get(w.modulo_id) ?? [];
    lista.push({ id: w.id, titolo: w.titolo, inizio: w.inizio, fine: w.fine });
    webinarPerModulo.set(w.modulo_id, lista);
  }

  const moduliConWebinar = moduli.map((m) => ({ ...m, webinar: webinarPerModulo.get(m.id) ?? [] }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Iscrizione — Passo 1 di 2
        </h1>
        <p className="text-muted-foreground mt-1">{corso.titolo}</p>
      </div>
      <Passo1Form
        corsoId={corso.id}
        moduli={moduliConWebinar}
        pacchetti={pacchettiConModuli}
        moduliCopertiIds={[...moduliCopertiIds]}
        datiFiscaliIniziali={datiFiscaliIniziali}
        earlyBirdScadenza={corso.early_bird_scadenza}
        earlyBirdPercentuale={corso.early_bird_percentuale}
        firstMoverScadenza={corso.first_mover_scadenza}
        firstMoverPercentuale={corso.first_mover_percentuale}
      />
    </div>
  );
}
