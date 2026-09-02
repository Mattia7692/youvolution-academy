import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { CodiceScontoForm } from "@/components/codice-sconto-form";
import { CodiceScontoRiga } from "@/components/codice-sconto-riga";

export default async function CodiciScontoPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  const [{ data: codiciSconto }, { data: corsi }, { data: iscrizioniConCodice }] = await Promise.all([
    supabase
      .from("codici_sconto")
      .select("id, codice, percentuale, corso_id, valido_da, valido_a, max_utilizzi, attivo")
      .order("created_at", { ascending: false }),
    supabase.from("corsi").select("id, titolo").order("titolo", { ascending: true }),
    // Utilizzi per codice: verificati (contano davvero) vs in corso di
    // verifica (preavviso di pressione). L'admin vede tutte le iscrizioni via
    // RLS, quindi il conteggio si fa qui senza funzione dedicata.
    supabase
      .from("iscrizioni")
      .select("codice_sconto_inserito, stato")
      .not("codice_sconto_inserito", "is", null),
  ]);

  const utilizziPerCodice = new Map<string, { verificati: number; inAttesa: number }>();
  for (const iscrizione of iscrizioniConCodice ?? []) {
    const codice = iscrizione.codice_sconto_inserito as string;
    const conteggio = utilizziPerCodice.get(codice) ?? { verificati: 0, inAttesa: 0 };
    if (iscrizione.stato === "verificata") {
      conteggio.verificati += 1;
    } else if (["in_attesa_pagamento", "cro_inserito", "cro_da_chiarire"].includes(iscrizione.stato)) {
      conteggio.inAttesa += 1;
    }
    utilizziPerCodice.set(codice, conteggio);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Codici sconto</h1>
        <p className="text-muted-foreground mt-1">
          Unico meccanismo di scontistica oltre all&apos;early bird automatico: crea un codice e
          comunicalo a chi ne ha diritto (alumni, amici, transizioni di carriera, promozioni). Non
          cumulabile con l&apos;early bird né con altri codici.
        </p>
      </div>

      <CodiceScontoForm corsi={corsi ?? []} />

      <div className="space-y-3">
        {!codiciSconto || codiciSconto.length === 0 ? (
          <p className="text-muted-foreground">Nessun codice sconto creato ancora.</p>
        ) : (
          codiciSconto.map((codiceSconto) => (
            <CodiceScontoRiga
              key={codiceSconto.id}
              codiceSconto={codiceSconto}
              corsi={corsi ?? []}
              utilizzi={utilizziPerCodice.get(codiceSconto.codice) ?? { verificati: 0, inAttesa: 0 }}
            />
          ))
        )}
      </div>
    </div>
  );
}
