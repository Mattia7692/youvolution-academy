import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompletaDatiForm } from "@/components/completa-dati-form";
import type { DatiFiscali } from "@/app/(autenticato)/iscrizione/actions";

export default async function CompletaDatiPage({
  params,
}: {
  params: Promise<{ iscrizioneId: string }>;
}) {
  const { iscrizioneId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: iscrizione } = await supabase
    .from("iscrizioni")
    .select(
      "id, corsista_id, corsi(titolo), tipo_soggetto, ragione_sociale, codice_fiscale, partita_iva, indirizzo, cap, citta, provincia, nazione, codice_sdi, pec, cellulare, data_nascita",
    )
    .eq("id", iscrizioneId)
    .maybeSingle();

  if (!iscrizione || iscrizione.corsista_id !== user.id) {
    redirect("/le-mie-iscrizioni");
  }

  const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;

  const datiIniziali: DatiFiscali = {
    tipo_soggetto: (iscrizione.tipo_soggetto as DatiFiscali["tipo_soggetto"]) ?? "privato",
    ragione_sociale: iscrizione.ragione_sociale ?? "",
    codice_fiscale: iscrizione.codice_fiscale ?? "",
    partita_iva: iscrizione.partita_iva ?? "",
    indirizzo: iscrizione.indirizzo ?? "",
    cap: iscrizione.cap ?? "",
    citta: iscrizione.citta ?? "",
    provincia: iscrizione.provincia ?? "",
    nazione: iscrizione.nazione ?? "IT",
    codice_sdi: iscrizione.codice_sdi ?? "",
    pec: iscrizione.pec ?? "",
    cellulare: iscrizione.cellulare ?? "",
    data_nascita: iscrizione.data_nascita ?? "",
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Completa i tuoi dati</h1>
        <p className="text-muted-foreground mt-1">{corso?.titolo}</p>
      </div>
      <CompletaDatiForm iscrizioneId={iscrizione.id} datiIniziali={datiIniziali} />
    </div>
  );
}
