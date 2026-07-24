import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { ModuloRiga } from "@/components/modulo-riga";
import { ModuloForm } from "@/components/modulo-form";
import { PacchettoRiga } from "@/components/pacchetto-riga";
import { PacchettoForm } from "@/components/pacchetto-form";

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

  const [{ data: moduli }, { data: pacchetti }, { data: pacchettoModuli }] = await Promise.all([
    supabase
      .from("moduli_corso")
      .select(
        "id, corso_id, titolo, descrizione, imponibile, scadenza_iscrizione, data_inizio, posti_disponibili, iscrizioni_chiuse, acquistabile, attivo",
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
  ]);

  const moduliIds = (moduli ?? []).map((m) => m.id);
  const { data: webinarRows } =
    moduliIds.length > 0
      ? await supabase
          .from("webinar_modulo")
          .select("id, modulo_id, titolo, inizio, fine")
          .in("modulo_id", moduliIds)
          .order("ordine", { ascending: true })
      : { data: [] };

  const webinarPerModulo = new Map<string, { id: string; titolo: string; inizio: string; fine: string }[]>();
  for (const w of webinarRows ?? []) {
    const lista = webinarPerModulo.get(w.modulo_id) ?? [];
    lista.push({ id: w.id, titolo: w.titolo, inizio: w.inizio, fine: w.fine });
    webinarPerModulo.set(w.modulo_id, lista);
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

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/corsi" className="text-sm text-muted-foreground hover:underline">
          ← Gestione corsi
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-1">{corso.titolo}</h1>
        <Link
          href={`/admin/corsi/${corsoId}/iscritti`}
          className="text-sm text-muted-foreground hover:underline"
        >
          Vai a Gestione iscrizioni →
        </Link>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Moduli</h2>
        <div className="space-y-2">
          {(moduli ?? []).map((modulo) => (
            <ModuloRiga key={modulo.id} modulo={modulo} webinar={webinarPerModulo.get(modulo.id) ?? []} />
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
    </div>
  );
}
