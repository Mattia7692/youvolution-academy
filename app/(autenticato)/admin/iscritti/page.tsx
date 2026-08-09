import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { IscrittiLista, type IscrittoConCorso } from "@/components/iscritti-lista";
import type { StatoIscrizione } from "@/components/stato-badge";

export default async function IscrittiPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  // iscrizioni ha due FK verso profiles (corsista_id e verificata_da): senza
  // l'hint esplicito PostgREST non sa quale usare e l'embed fallisce con un
  // errore, che va sempre controllato esplicitamente (altrimenti la query
  // fallisce silenziosamente e la pagina sembra solo "vuota").
  //
  // Un'iscrizione con piano rate resta 'in_attesa_pagamento' finche' non
  // sono tutte verificate (vedi verificaRata in admin/actions.ts): va comunque
  // mostrata qui non appena almeno una rata e' verificata, con il progresso
  // "N/M rate pagate", altrimenti l'admin la perde di vista finche' non paga
  // l'ultima.
  const [{ data: candidate, error }, { data: codiciFirstMover }] = await Promise.all([
    supabase
      .from("iscrizioni")
      .select(
        "id, stato, created_at, verificata_at, sconto_tipo, sconto_percentuale, codice_sconto_inserito, corso_id, conferma_inviata_at, corsi(titolo), profiles!corsista_id(nome, cognome, email)",
      )
      .in("stato", ["verificata", "in_attesa_pagamento"])
      .order("created_at", { ascending: false }),
    supabase.from("codici_sconto").select("corso_id, codice").like("codice", "FIRSTMOVER-%"),
  ]);

  if (error) {
    console.error("[admin/iscritti] errore nel caricamento iscritti", error);
  }

  const iscrizioneIds = (candidate ?? []).map((i) => i.id);
  const { data: rate } = await (iscrizioneIds.length > 0
    ? supabase.from("iscrizioni_rate").select("iscrizione_id, stato").in("iscrizione_id", iscrizioneIds)
    : Promise.resolve({ data: [] as { iscrizione_id: string; stato: string }[] }));

  const rateProgressPerIscrizione = new Map<string, { verificate: number; totale: number }>();
  for (const r of rate ?? []) {
    const progresso = rateProgressPerIscrizione.get(r.iscrizione_id) ?? { verificate: 0, totale: 0 };
    progresso.totale += 1;
    if (r.stato === "verificata") progresso.verificate += 1;
    rateProgressPerIscrizione.set(r.iscrizione_id, progresso);
  }

  // Tra le iscrizioni ancora 'in_attesa_pagamento' teniamo solo quelle con un
  // piano rate e almeno una rata gia' verificata: le altre sono carrelli
  // aperti qualsiasi, non "iscritti" da mostrare qui.
  const iscritti = (candidate ?? []).filter((i) => {
    if (i.stato === "verificata") return true;
    const progresso = rateProgressPerIscrizione.get(i.id);
    return !!progresso && progresso.verificate > 0;
  });

  const codiceFirstMoverPerCorso = new Map<string, string>();
  for (const riga of codiciFirstMover ?? []) {
    if (riga.corso_id) codiceFirstMoverPerCorso.set(riga.corso_id, riga.codice);
  }

  const iscrittiConCorso: IscrittoConCorso[] = iscritti.map((iscrizione) => {
    const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;
    const corsista = Array.isArray(iscrizione.profiles) ? iscrizione.profiles[0] : iscrizione.profiles;

    return {
      iscrizioneId: iscrizione.id,
      stato: iscrizione.stato as StatoIscrizione,
      nome: corsista?.nome,
      cognome: corsista?.cognome,
      email: corsista?.email,
      createdAt: iscrizione.created_at,
      scontoTipo: iscrizione.sconto_tipo as "nessuno" | "early_bird" | "first_mover" | "codice" | null,
      scontoPercentuale: iscrizione.sconto_percentuale,
      codiceScontoInserito: iscrizione.codice_sconto_inserito,
      codiceFirstMoverCorso: codiceFirstMoverPerCorso.get(iscrizione.corso_id) ?? null,
      corsoId: iscrizione.corso_id,
      corsoTitolo: corso?.titolo ?? "Corso",
      confermaInviataAt: iscrizione.conferma_inviata_at,
      rateProgress: rateProgressPerIscrizione.get(iscrizione.id) ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Iscritti</h1>
        <p className="text-muted-foreground mt-1">
          Iscrizioni verificate, o con almeno una rata pagata per i piani personalizzati.
        </p>
      </div>

      {iscrittiConCorso.length === 0 ? (
        <p className="text-muted-foreground">Nessun iscritto verificato ancora.</p>
      ) : (
        <IscrittiLista iscritti={iscrittiConCorso} />
      )}
    </div>
  );
}
