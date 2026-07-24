import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { scadenzaEarlyBird } from "@/lib/prezzo";

export default async function CatalogoPage() {
  const supabase = await createClient();
  const [{ data: corsi }, { data: moduli }, { data: pacchetti }] = await Promise.all([
    supabase
      .from("corsi")
      .select("id, titolo, descrizione, calendario, sold_out_manuale, iscrizioni_chiuse_manuale")
      .eq("attivo", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("moduli_corso")
      .select("id, corso_id, data_inizio, scadenza_iscrizione, posti_disponibili")
      .eq("attivo", true),
    supabase
      .from("pacchetti_corso")
      .select("id, corso_id, scadenza_iscrizione, posti_disponibili")
      .eq("attivo", true),
  ]);

  const dateInizioPerCorso = new Map<string, string[]>();
  for (const m of moduli ?? []) {
    const lista = dateInizioPerCorso.get(m.corso_id) ?? [];
    lista.push(m.data_inizio);
    dateInizioPerCorso.set(m.corso_id, lista);
  }

  const oggi = new Date().toISOString().slice(0, 10);
  const earlyBirdAttivoPerCorso = new Map<string, boolean>();
  for (const [corsoId, date] of dateInizioPerCorso) {
    const cutoff = scadenzaEarlyBird(date);
    earlyBirdAttivoPerCorso.set(corsoId, !!cutoff && oggi <= cutoff);
  }

  // Sold out automatico: un corso e' pieno quando TUTTE le sue opzioni
  // attive (moduli + pacchetti) hanno un limite di posti impostato e
  // l'hanno raggiunto. Basta un'opzione senza limite (posti illimitati) per
  // escludere il corso da questo calcolo.
  const totaleOpzioniPerCorso = new Map<string, number>();
  for (const m of moduli ?? []) {
    totaleOpzioniPerCorso.set(m.corso_id, (totaleOpzioniPerCorso.get(m.corso_id) ?? 0) + 1);
  }
  for (const p of pacchetti ?? []) {
    totaleOpzioniPerCorso.set(p.corso_id, (totaleOpzioniPerCorso.get(p.corso_id) ?? 0) + 1);
  }

  const opzioniConLimite = [
    ...(moduli ?? [])
      .filter((m) => m.posti_disponibili !== null)
      .map((m) => ({ corsoId: m.corso_id, tipo: "modulo" as const, id: m.id, posti: m.posti_disponibili! })),
    ...(pacchetti ?? [])
      .filter((p) => p.posti_disponibili !== null)
      .map((p) => ({ corsoId: p.corso_id, tipo: "pacchetto" as const, id: p.id, posti: p.posti_disponibili! })),
  ];

  const occupazioni = await Promise.all(
    opzioniConLimite.map((o) =>
      o.tipo === "modulo"
        ? supabase.rpc("posti_occupati_modulo", { p_modulo_id: o.id })
        : supabase.rpc("posti_occupati_pacchetto", { p_pacchetto_id: o.id }),
    ),
  );

  const opzioniPienePerCorso = new Map<string, number>();
  opzioniConLimite.forEach((o, i) => {
    const occupati = occupazioni[i].data ?? 0;
    if (occupati >= o.posti) {
      opzioniPienePerCorso.set(o.corsoId, (opzioniPienePerCorso.get(o.corsoId) ?? 0) + 1);
    }
  });

  const soldOutAutomaticoPerCorso = new Map<string, boolean>();
  for (const [corsoId, totale] of totaleOpzioniPerCorso) {
    soldOutAutomaticoPerCorso.set(corsoId, totale > 0 && (opzioniPienePerCorso.get(corsoId) ?? 0) === totale);
  }

  // Iscrizioni chiuse automatiche: un corso le ha chiuse quando TUTTE le sue
  // opzioni attive (moduli + pacchetti) hanno superato la propria scadenza
  // di iscrizione.
  const opzioniScadutePerCorso = new Map<string, number>();
  for (const m of moduli ?? []) {
    if (m.scadenza_iscrizione < oggi) {
      opzioniScadutePerCorso.set(m.corso_id, (opzioniScadutePerCorso.get(m.corso_id) ?? 0) + 1);
    }
  }
  for (const p of pacchetti ?? []) {
    if (p.scadenza_iscrizione < oggi) {
      opzioniScadutePerCorso.set(p.corso_id, (opzioniScadutePerCorso.get(p.corso_id) ?? 0) + 1);
    }
  }

  const iscrizioniChiuseAutomaticoPerCorso = new Map<string, boolean>();
  for (const [corsoId, totale] of totaleOpzioniPerCorso) {
    iscrizioniChiuseAutomaticoPerCorso.set(
      corsoId,
      totale > 0 && (opzioniScadutePerCorso.get(corsoId) ?? 0) === totale,
    );
  }

  // Corsi per cui l'utente ha già riservato il posto (passo 1 completato) ma
  // non ha ancora inserito il CRO: nel catalogo li segnaliamo per farlo
  // tornare a completare l'iscrizione invece di ripartire da zero.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let corsiInSospeso = new Set<string>();
  if (user) {
    const { data: sospese } = await supabase
      .from("iscrizioni")
      .select("corso_id")
      .eq("corsista_id", user.id)
      .eq("stato", "in_attesa_pagamento");
    corsiInSospeso = new Set((sospese ?? []).map((s) => s.corso_id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Catalogo corsi</h1>
        <p className="text-muted-foreground mt-1">
          Scegli un corso per avviare la tua iscrizione.
        </p>
      </div>

      {!corsi || corsi.length === 0 ? (
        <p className="text-muted-foreground">Nessun corso disponibile al momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {corsi.map((corso) => {
            const inSospeso = corsiInSospeso.has(corso.id);
            const soldOut =
              !inSospeso && (corso.sold_out_manuale || !!soldOutAutomaticoPerCorso.get(corso.id));
            const iscrizioniChiuse =
              !inSospeso &&
              !soldOut &&
              (corso.iscrizioni_chiuse_manuale || !!iscrizioniChiuseAutomaticoPerCorso.get(corso.id));

            return (
              <Card
                key={corso.id}
                className={`relative overflow-hidden ${
                  inSospeso ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20" : ""
                }`}
              >
                {soldOut && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <span className="-rotate-12 rounded-md border-4 border-red-600/80 bg-background/60 px-6 py-1.5 text-2xl font-black uppercase tracking-widest text-red-600/80">
                      Sold out
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{corso.titolo}</CardTitle>
                  {corso.descrizione && (
                    <CardDescription>{corso.descrizione}</CardDescription>
                  )}
                  {corso.calendario && (
                    <p className="text-sm text-muted-foreground mt-1">📅 {corso.calendario}</p>
                  )}
                  {earlyBirdAttivoPerCorso.get(corso.id) && (
                    <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 mt-1">
                      Sconto early bird attivo
                    </span>
                  )}
                  {iscrizioniChiuse && (
                    <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 mt-1">
                      Iscrizioni chiuse
                    </span>
                  )}
                  {inSospeso && (
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mt-1">
                      Iscrizione in corso — completa il pagamento
                    </p>
                  )}
                </CardHeader>
                <CardFooter>
                  {soldOut ? (
                    <Button className="w-full" variant="outline" disabled>
                      Sold out
                    </Button>
                  ) : iscrizioniChiuse ? (
                    <Button className="w-full" variant="outline" disabled>
                      Iscrizioni chiuse
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className={inSospeso ? "w-full bg-orange-600 hover:bg-orange-700" : "w-full"}
                    >
                      <Link href={`/iscrizione/${corso.id}/${inSospeso ? "passo-2" : "passo-1"}`}>
                        {inSospeso ? "Continua iscrizione" : "Iscriviti"}
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
