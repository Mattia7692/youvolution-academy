import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { IscrittoRiga } from "@/components/iscritto-riga";
import type { StatoIscrizione } from "@/components/stato-badge";

function formattaPrezzo(prezzo: number | null) {
  if (prezzo === null) return "Prezzo da impostare";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export default async function DettaglioCorsoPage({
  params,
}: {
  params: Promise<{ corsoId: string }>;
}) {
  const { corsoId } = await params;
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  const { data: corso } = await supabase
    .from("corsi")
    .select("id, titolo, prezzo, posti_disponibili")
    .eq("id", corsoId)
    .maybeSingle();

  if (!corso) notFound();

  // iscrizioni ha due FK verso profiles (corsista_id e verificata_da): serve
  // l'hint esplicito, altrimenti PostgREST non sa quale usare.
  const { data: iscritti, error } = await supabase
    .from("iscrizioni")
    .select("id, stato, prezzo_snapshot, created_at, profiles!corsista_id(nome, cognome, email)")
    .eq("corso_id", corsoId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/corsi/:id] errore nel caricamento iscritti", error);
  }

  const verificati = iscritti?.filter((i) => i.stato === "verificata").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/corsi" className="text-sm text-muted-foreground hover:underline">
          ← Gestione corsi
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-1">{corso.titolo}</h1>
        <p className="text-muted-foreground mt-1">
          {formattaPrezzo(corso.prezzo)} · {verificati}
          {corso.posti_disponibili !== null ? ` / ${corso.posti_disponibili}` : ""} iscritti verificati
        </p>
      </div>

      {!iscritti || iscritti.length === 0 ? (
        <p className="text-muted-foreground">Nessuna iscrizione per questo corso ancora.</p>
      ) : (
        <div className="space-y-3">
          {iscritti.map((iscrizione) => {
            const corsista = Array.isArray(iscrizione.profiles)
              ? iscrizione.profiles[0]
              : iscrizione.profiles;
            return (
              <IscrittoRiga
                key={iscrizione.id}
                iscrizioneId={iscrizione.id}
                stato={iscrizione.stato as StatoIscrizione}
                nome={corsista?.nome}
                cognome={corsista?.cognome}
                email={corsista?.email}
                createdAt={iscrizione.created_at}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
