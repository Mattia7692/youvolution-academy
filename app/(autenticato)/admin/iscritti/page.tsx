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
  const [{ data: iscritti, error }, { data: codiciFirstMover }] = await Promise.all([
    supabase
      .from("iscrizioni")
      .select(
        "id, stato, created_at, sconto_tipo, sconto_percentuale, codice_sconto_inserito, corso_id, corsi(titolo), profiles!corsista_id(nome, cognome, email)",
      )
      .eq("stato", "verificata")
      .order("verificata_at", { ascending: false }),
    supabase.from("codici_sconto").select("corso_id, codice").like("codice", "FIRSTMOVER-%"),
  ]);

  if (error) {
    console.error("[admin/iscritti] errore nel caricamento iscritti", error);
  }

  const codiceFirstMoverPerCorso = new Map<string, string>();
  for (const riga of codiciFirstMover ?? []) {
    if (riga.corso_id) codiceFirstMoverPerCorso.set(riga.corso_id, riga.codice);
  }

  const iscrittiConCorso: IscrittoConCorso[] = (iscritti ?? []).map((iscrizione) => {
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
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Iscritti</h1>
        <p className="text-muted-foreground mt-1">
          Iscrizioni verificate su tutti i corsi — dopo Prenotazioni e Coda di verifica, arrivano qui.
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
