import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";

function formattaPrezzo(prezzo: number | null) {
  if (prezzo === null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

function formattaData(data: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(data),
  );
}

export default async function PrenotazioniPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  // iscrizioni ha due FK verso profiles (corsista_id e verificata_da): senza
  // l'hint esplicito PostgREST non sa quale usare e l'embed fallisce con un
  // errore, che va sempre controllato esplicitamente (altrimenti la query
  // fallisce silenziosamente e la pagina sembra solo "vuota").
  const { data: iscrizioni, error } = await supabase
    .from("iscrizioni")
    .select(
      "id, prezzo_snapshot, created_at, corsi(titolo), profiles!corsista_id(nome, cognome, email)",
    )
    .eq("stato", "in_attesa_pagamento")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[prenotazioni] errore nel caricamento", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Prenotazioni</h1>
        <p className="text-muted-foreground mt-1">
          Corsisti che hanno completato il Passo 1 e sono in attesa di effettuare il bonifico.
        </p>
      </div>

      {!iscrizioni || iscrizioni.length === 0 ? (
        <p className="text-muted-foreground">Nessuna prenotazione in attesa al momento.</p>
      ) : (
        <div className="space-y-3">
          {iscrizioni.map((iscrizione) => {
            const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;
            const corsista = Array.isArray(iscrizione.profiles)
              ? iscrizione.profiles[0]
              : iscrizione.profiles;

            return (
              <div
                key={iscrizione.id}
                className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-foreground">{corso?.titolo ?? "Corso"}</p>
                  <p className="text-sm text-muted-foreground">
                    {corsista?.nome} {corsista?.cognome} · {corsista?.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formattaPrezzo(iscrizione.prezzo_snapshot)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prenotato il {formattaData(iscrizione.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
