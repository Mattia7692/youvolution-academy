import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin, normalizzaRuolo } from "@/lib/roles";
import { SchedaProfiloCorsista } from "@/components/scheda-profilo-corsista";
import { NotaAdminForm } from "@/components/nota-admin-form";
import { RichiestaCancellazioneBanner } from "@/components/richiesta-cancellazione-banner";
import { StoricoCorsoRiga, COLONNE_TABELLA_STORICO, type StoricoCorso } from "@/components/storico-corso-riga";
import { formattaPrezzo } from "@/lib/prezzo";
import type { DatiCorsistaAdmin } from "@/app/(autenticato)/admin/actions";
import type { StatoIscrizione } from "@/components/stato-badge";

export default async function SchedaUtentePage({
  params,
}: {
  params: Promise<{ utenteId: string }>;
}) {
  const { utenteId } = await params;
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  // La RLS su profiles nasconde gia' le righe owner a un admin non-owner: se
  // il target e' un owner e il chiamante non lo e', questa select non
  // ritorna nulla, ed e' la stessa barriera che gia' filtra la lista.
  const [{ data: profilo }, { data: nota }, { data: richiestaCancellazione }, { data: iscrizioniRaw }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, nome, cognome, email, ruolo, created_at, tipo_soggetto, ragione_sociale, codice_fiscale, partita_iva, indirizzo, cap, citta, provincia, nazione, codice_sdi, pec, cellulare, data_nascita, azienda, ruolo_aziendale",
        )
        .eq("id", utenteId)
        .maybeSingle(),
      supabase.from("profili_note_admin").select("nota").eq("profilo_id", utenteId).maybeSingle(),
      supabase
        .from("richieste_cancellazione")
        .select("id, messaggio, created_at")
        .eq("profilo_id", utenteId)
        .eq("stato", "in_attesa")
        .maybeSingle(),
      supabase
        .from("iscrizioni")
        .select(
          "id, stato, created_at, totale_snapshot, sconto_tipo, sconto_percentuale, codice_sconto_inserito, corsi(titolo), pacchetti_corso(titolo), iscrizione_moduli(moduli_corso(titolo)), iscrizioni_rate(numero, stato)",
        )
        .eq("corsista_id", utenteId)
        .order("created_at", { ascending: false }),
    ]);

  if (!profilo) notFound();

  const ruolo = normalizzaRuolo(profilo.ruolo);

  const datiIniziali: DatiCorsistaAdmin = {
    tipo_soggetto: (profilo.tipo_soggetto as DatiCorsistaAdmin["tipo_soggetto"]) ?? "privato",
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
    azienda: profilo.azienda ?? "",
    ruolo_aziendale: profilo.ruolo_aziendale ?? "",
  };

  const storico: StoricoCorso[] = (iscrizioniRaw ?? []).map((iscrizione) => {
    const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;
    const pacchetto = Array.isArray(iscrizione.pacchetti_corso)
      ? iscrizione.pacchetti_corso[0]
      : iscrizione.pacchetti_corso;
    const moduli = (iscrizione.iscrizione_moduli ?? [])
      .map((im) => (Array.isArray(im.moduli_corso) ? im.moduli_corso[0] : im.moduli_corso))
      .map((m) => m?.titolo)
      .filter((t): t is string => Boolean(t));

    return {
      id: iscrizione.id,
      stato: iscrizione.stato as StatoIscrizione,
      createdAt: iscrizione.created_at,
      totaleSnapshot: iscrizione.totale_snapshot,
      scontoTipo: iscrizione.sconto_tipo as StoricoCorso["scontoTipo"],
      scontoPercentuale: iscrizione.sconto_percentuale,
      codiceScontoInserito: iscrizione.codice_sconto_inserito,
      corsoTitolo: corso?.titolo ?? null,
      pacchettoTitolo: pacchetto?.titolo ?? null,
      moduliTitoli: moduli,
      rate: (iscrizione.iscrizioni_rate ?? []).map((r) => ({
        numero: r.numero,
        stato: r.stato as StatoIscrizione,
      })),
    };
  });

  // Il totale conta solo cio' che e' stato effettivamente incassato
  // (iscrizioni verificate): un'iscrizione ancora in attesa di pagamento non
  // e' denaro "totale", solo denaro atteso.
  const totaleIncassato = storico
    .filter((s) => s.stato === "verificata")
    .reduce((somma, s) => somma + (s.totaleSnapshot ?? 0), 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/utenti" className="text-sm text-muted-foreground hover:underline">
          ← Gestione utenti
        </Link>
      </div>

      <SchedaProfiloCorsista
        profiloId={profilo.id}
        nome={profilo.nome}
        cognome={profilo.cognome}
        email={profilo.email}
        cellulare={profilo.cellulare}
        createdAt={profilo.created_at}
        ruolo={ruolo}
        isSelf={profilo.id === admin.id}
        viewerIsOwner={admin.ruolo === "owner"}
        datiIniziali={datiIniziali}
      />

      {richiestaCancellazione && (
        <RichiestaCancellazioneBanner
          richiestaId={richiestaCancellazione.id}
          messaggio={richiestaCancellazione.messaggio}
          createdAt={richiestaCancellazione.created_at}
        />
      )}

      <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
          <h2 className="font-medium text-foreground">Storico corsi</h2>
          <p className="text-sm text-muted-foreground">
            {storico.length} iscrizion{storico.length === 1 ? "e" : "i"}
            {totaleIncassato > 0 && ` · ${formattaPrezzo(totaleIncassato)} totali`}
          </p>
        </div>
        {storico.length === 0 ? (
          <p className="text-muted-foreground p-6">Nessuna iscrizione registrata.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div
                className={`grid ${COLONNE_TABELLA_STORICO} gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border`}
              >
                <span>Corso</span>
                <span>Anno</span>
                <span>Pagamento</span>
                <span>Sconto</span>
                <span>Stato</span>
                <span className="text-right">Importo</span>
              </div>
              {storico.map((voce) => (
                <StoricoCorsoRiga key={voce.id} voce={voce} />
              ))}
            </div>
          </div>
        )}
      </div>

      <NotaAdminForm profiloId={profilo.id} notaIniziale={nota?.nota ?? ""} />
    </div>
  );
}
