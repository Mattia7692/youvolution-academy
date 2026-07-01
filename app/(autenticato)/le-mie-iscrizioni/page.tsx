import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatoBadge, type StatoIscrizione } from "@/components/stato-badge";
import { Button } from "@/components/ui/button";

function formattaPrezzo(prezzo: number | null) {
  if (prezzo === null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export default async function LeMieIscrizioniPage() {
  const supabase = await createClient();
  const { data: iscrizioni } = await supabase
    .from("iscrizioni")
    .select("id, corso_id, stato, prezzo_snapshot, cro, nota_admin, created_at, corsi(titolo)")
    .order("created_at", { ascending: false });

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
            return (
              <div
                key={iscrizione.id}
                className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-foreground">{corso?.titolo ?? "Corso"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formattaPrezzo(iscrizione.prezzo_snapshot)}
                    {iscrizione.cro && ` · CRO ${iscrizione.cro}`}
                  </p>
                  {iscrizione.stato === "cro_da_chiarire" && iscrizione.nota_admin && (
                    <p className="text-sm text-red-700 mt-1">{iscrizione.nota_admin}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatoBadge stato={iscrizione.stato as StatoIscrizione} />
                  {iscrizione.stato === "in_attesa_pagamento" && (
                    <Button asChild size="sm">
                      <Link href={`/iscrizione/${iscrizione.corso_id}/modulo-2`}>
                        Continua
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
