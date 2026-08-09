import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatoBadge, type StatoIscrizione } from "@/components/stato-badge";
import { Button } from "@/components/ui/button";
import { formattaData, formattaPrezzo } from "@/lib/prezzo";

const STATI_BLOCCANTI = ["cro_inserito", "cro_da_chiarire", "verificata"] as const;

type Rata = {
  id: string;
  iscrizione_id: string;
  numero: number;
  importo: number;
  stato: string;
  cro: string | null;
  scadenza: string | null;
};

export default async function LeMieIscrizioniPage() {
  const supabase = await createClient();
  const { data: iscrizioni } = await supabase
    .from("iscrizioni")
    .select(
      "id, corso_id, stato, totale_snapshot, cro, nota_admin, created_at, pacchetto_id, ragione_sociale, codice_fiscale, corsi(titolo), pacchetti_corso(titolo), iscrizione_moduli(modulo_id, moduli_corso(titolo))",
    )
    .order("created_at", { ascending: false });

  const corsoIds = Array.from(new Set((iscrizioni ?? []).map((i) => i.corso_id)));
  const pacchettoIds = Array.from(
    new Set((iscrizioni ?? []).map((i) => i.pacchetto_id).filter((id): id is string => !!id)),
  );
  const iscrizioneIds = (iscrizioni ?? []).map((i) => i.id);

  const [{ data: moduliCorsi }, { data: pacchettoModuli }, { data: rate }] = await Promise.all([
    corsoIds.length > 0
      ? supabase.from("moduli_corso").select("id, corso_id").eq("attivo", true).in("corso_id", corsoIds)
      : Promise.resolve({ data: [] as { id: string; corso_id: string }[] }),
    pacchettoIds.length > 0
      ? supabase.from("pacchetto_moduli").select("pacchetto_id, modulo_id").in("pacchetto_id", pacchettoIds)
      : Promise.resolve({ data: [] as { pacchetto_id: string; modulo_id: string }[] }),
    iscrizioneIds.length > 0
      ? supabase
          .from("iscrizioni_rate")
          .select("id, iscrizione_id, numero, importo, stato, cro, scadenza")
          .in("iscrizione_id", iscrizioneIds)
          .order("numero", { ascending: true })
      : Promise.resolve({ data: [] as Rata[] }),
  ]);

  const ratePerIscrizione = new Map<string, Rata[]>();
  for (const r of (rate ?? []) as Rata[]) {
    const lista = ratePerIscrizione.get(r.iscrizione_id) ?? [];
    lista.push(r);
    ratePerIscrizione.set(r.iscrizione_id, lista);
  }

  const moduliTotaliPerCorso = new Map<string, Set<string>>();
  for (const m of moduliCorsi ?? []) {
    const set = moduliTotaliPerCorso.get(m.corso_id) ?? new Set<string>();
    set.add(m.id);
    moduliTotaliPerCorso.set(m.corso_id, set);
  }

  const moduliIdsPerPacchetto = new Map<string, string[]>();
  for (const r of pacchettoModuli ?? []) {
    const lista = moduliIdsPerPacchetto.get(r.pacchetto_id) ?? [];
    lista.push(r.modulo_id);
    moduliIdsPerPacchetto.set(r.pacchetto_id, lista);
  }

  // Un'iscrizione con piano rate personalizzato resta 'in_attesa_pagamento'
  // finche' non sono tutte verificate (vedi verificaRata in admin/actions.ts):
  // per la copertura moduli va trattata come bloccante esattamente come
  // cro_inserito/verificata, non come un carrello aperto qualsiasi.
  const haPianoRate = (iscrizioneId: string) => (ratePerIscrizione.get(iscrizioneId)?.length ?? 0) > 0;
  const isBloccante = (i: { id: string; stato: string }) =>
    STATI_BLOCCANTI.includes(i.stato as (typeof STATI_BLOCCANTI)[number]) ||
    (i.stato === "in_attesa_pagamento" && haPianoRate(i.id));

  // Copertura per corso: unione dei moduli coperti dalle iscrizioni bloccanti
  // di questo utente per quel corso — un corso puo' avere piu' iscrizioni,
  // ognuna su un sottoinsieme di moduli.
  const moduliCopertiPerCorso = new Map<string, Set<string>>();
  for (const i of iscrizioni ?? []) {
    if (!isBloccante(i)) continue;
    const set = moduliCopertiPerCorso.get(i.corso_id) ?? new Set<string>();
    for (const im of i.iscrizione_moduli ?? []) set.add(im.modulo_id);
    if (i.pacchetto_id) {
      for (const moduloId of moduliIdsPerPacchetto.get(i.pacchetto_id) ?? []) set.add(moduloId);
    }
    moduliCopertiPerCorso.set(i.corso_id, set);
  }

  const corsoIncompleto = (corsoId: string) => {
    const totali = moduliTotaliPerCorso.get(corsoId);
    if (!totali || totali.size <= 1) return false;
    const coperti = moduliCopertiPerCorso.get(corsoId) ?? new Set<string>();
    return ![...totali].every((id) => coperti.has(id));
  };

  // Il pulsante "Aggiungi moduli" va mostrato una sola volta per corso, sulla
  // riga piu' recente tra quelle bloccanti — non su ogni riga che condivide
  // lo stesso corso.
  const iscrizioneBottoneAggiuntaPerCorso = new Map<string, string>();
  for (const i of iscrizioni ?? []) {
    if (isBloccante(i) && corsoIncompleto(i.corso_id) && !iscrizioneBottoneAggiuntaPerCorso.has(i.corso_id)) {
      iscrizioneBottoneAggiuntaPerCorso.set(i.corso_id, i.id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Le mie iscrizioni</h1>
          <p className="text-muted-foreground mt-1">
            Stato delle iscrizioni ai corsi Youvolution Academy.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/catalogo">Nuova iscrizione</Link>
        </Button>
      </div>

      {!iscrizioni || iscrizioni.length === 0 ? (
        <p className="text-muted-foreground">Non hai ancora nessuna iscrizione.</p>
      ) : (
        <div className="space-y-3">
          {iscrizioni.map((iscrizione) => {
            const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;
            const pacchetto = Array.isArray(iscrizione.pacchetti_corso)
              ? iscrizione.pacchetti_corso[0]
              : iscrizione.pacchetti_corso;
            const moduliTitoli = (iscrizione.iscrizione_moduli ?? [])
              .map((im) => {
                const modulo = Array.isArray(im.moduli_corso) ? im.moduli_corso[0] : im.moduli_corso;
                return modulo?.titolo;
              })
              .filter((titolo): titolo is string => !!titolo);
            const copertura = pacchetto?.titolo ?? (moduliTitoli.length > 0 ? moduliTitoli.join(", ") : null);
            const rateIscrizione = ratePerIscrizione.get(iscrizione.id) ?? [];
            const primaRataAperta = rateIscrizione.find((r) => r.stato === "in_attesa_pagamento");
            const datiIncompleti =
              rateIscrizione.length > 0 && (!iscrizione.ragione_sociale || !iscrizione.codice_fiscale);

            return (
              <div key={iscrizione.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{corso?.titolo ?? "Corso"}</p>
                    {copertura && <p className="text-xs text-muted-foreground mt-0.5">{copertura}</p>}
                    <p className="text-sm text-muted-foreground mt-1">
                      {formattaPrezzo(iscrizione.totale_snapshot)}
                      {iscrizione.cro && ` · CRO ${iscrizione.cro}`}
                      {rateIscrizione.length > 0 && ` · piano a ${rateIscrizione.length} rate`}
                    </p>
                    {iscrizione.stato === "cro_da_chiarire" && iscrizione.nota_admin && (
                      <p className="text-sm text-red-700 mt-1">{iscrizione.nota_admin}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatoBadge stato={iscrizione.stato as StatoIscrizione} />
                    {iscrizione.stato === "in_attesa_pagamento" && rateIscrizione.length === 0 && (
                      <Button asChild size="sm">
                        <Link href={`/iscrizione/${iscrizione.corso_id}/passo-2`}>
                          Continua
                        </Link>
                      </Button>
                    )}
                    {iscrizioneBottoneAggiuntaPerCorso.get(iscrizione.corso_id) === iscrizione.id && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/iscrizione/${iscrizione.corso_id}/passo-1`}>
                          Aggiungi moduli
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {rateIscrizione.length > 0 && (
                  <div className="pt-3 border-t border-dashed border-border">
                    {datiIncompleti && (
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 mb-2">
                        <span>Mancano i tuoi dati anagrafici/fiscali per procedere con il pagamento.</span>
                        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
                          <Link href={`/le-mie-iscrizioni/${iscrizione.id}/dati`}>
                            Completa i tuoi dati
                          </Link>
                        </Button>
                      </div>
                    )}
                    {/* Griglia unica (non una per riga): le colonne si
                        allineano automaticamente sulla stessa X per tutte le
                        rate, a prescindere da quanto testo c'e' a sinistra. */}
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2">
                      {rateIscrizione.map((rata) => {
                        const isCorrente = primaRataAperta?.id === rata.id && !datiIncompleti;
                        return (
                          <Fragment key={rata.id}>
                            <span className="text-sm text-muted-foreground">
                              Rata {rata.numero} — {formattaPrezzo(rata.importo)}
                              {rata.scadenza && ` · scadenza ${formattaData(rata.scadenza)}`}
                              {rata.cro && ` · CRO ${rata.cro}`}
                            </span>
                            <span className="justify-self-start">
                              <StatoBadge stato={rata.stato as StatoIscrizione} />
                            </span>
                            {isCorrente ? (
                              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href={`/rate/${rata.id}`}>Paga rata</Link>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                Paga rata
                              </Button>
                            )}
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
