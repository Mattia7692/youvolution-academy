import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { IscrittoRiga } from "@/components/iscritto-riga";
import { ModuloRiga } from "@/components/modulo-riga";
import { ModuloForm } from "@/components/modulo-form";
import { PacchettoRiga } from "@/components/pacchetto-riga";
import { PacchettoForm } from "@/components/pacchetto-form";
import type { StatoIscrizione } from "@/components/stato-badge";

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
    .select("id, titolo")
    .eq("id", corsoId)
    .maybeSingle();

  if (!corso) notFound();

  const [{ data: moduli }, { data: pacchetti }, { data: pacchettoModuli }, { data: iscritti, error }] =
    await Promise.all([
      supabase
        .from("moduli_corso")
        .select(
          "id, corso_id, titolo, imponibile, scadenza_iscrizione, data_inizio, posti_disponibili, iscrizioni_chiuse, attivo",
        )
        .eq("corso_id", corsoId)
        .order("ordine", { ascending: true }),
      supabase
        .from("pacchetti_corso")
        .select(
          "id, corso_id, titolo, imponibile, scadenza_iscrizione, posti_disponibili, iscrizioni_chiuse, attivo",
        )
        .eq("corso_id", corsoId),
      supabase.from("pacchetto_moduli").select("pacchetto_id, modulo_id"),
      // iscrizioni ha due FK verso profiles (corsista_id e verificata_da): serve
      // l'hint esplicito, altrimenti PostgREST non sa quale usare.
      supabase
        .from("iscrizioni")
        .select("id, stato, created_at, profiles!corsista_id(nome, cognome, email)")
        .eq("corso_id", corsoId)
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    console.error("[admin/corsi/:id] errore nel caricamento iscritti", error);
  }

  const moduliIdsPerPacchetto = new Map<string, string[]>();
  for (const riga of pacchettoModuli ?? []) {
    const lista = moduliIdsPerPacchetto.get(riga.pacchetto_id) ?? [];
    lista.push(riga.modulo_id);
    moduliIdsPerPacchetto.set(riga.pacchetto_id, lista);
  }

  const moduliAttivi = (moduli ?? []).filter((m) => m.attivo);
  const pacchettiConModuli = (pacchetti ?? []).map((p) => ({
    ...p,
    moduloIds: moduliIdsPerPacchetto.get(p.id) ?? [],
  }));

  const verificati = iscritti?.filter((i) => i.stato === "verificata").length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/corsi" className="text-sm text-muted-foreground hover:underline">
          ← Gestione corsi
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-1">{corso.titolo}</h1>
        <p className="text-muted-foreground mt-1">{verificati} iscritti verificati</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Moduli</h2>
        <div className="space-y-2">
          {(moduli ?? []).map((modulo) => (
            <ModuloRiga key={modulo.id} modulo={modulo} />
          ))}
        </div>
        <ModuloForm corsoId={corsoId} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Pacchetti</h2>
        <p className="text-sm text-muted-foreground">
          Un pacchetto raggruppa più moduli a un prezzo scontato, con scadenze proprie.
        </p>
        <div className="space-y-2">
          {pacchettiConModuli.map((pacchetto) => (
            <PacchettoRiga key={pacchetto.id} pacchetto={pacchetto} moduli={moduli ?? []} />
          ))}
        </div>
        <PacchettoForm corsoId={corsoId} moduli={moduliAttivi} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Iscritti</h2>
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
    </div>
  );
}
