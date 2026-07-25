import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { DateNuovaEdizioneForm } from "@/components/date-nuova-edizione-form";

export default async function DateNuovaEdizionePage({
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
    .select(
      "id, titolo, calendario, early_bird_scadenza, early_bird_percentuale, first_mover_scadenza, first_mover_percentuale",
    )
    .eq("id", corsoId)
    .maybeSingle();

  if (!corso) notFound();

  const [{ data: moduli }, { data: pacchetti }] = await Promise.all([
    supabase
      .from("moduli_corso")
      .select("id, titolo, scadenza_iscrizione, data_inizio")
      .eq("corso_id", corsoId)
      .order("ordine", { ascending: true }),
    supabase.from("pacchetti_corso").select("id, titolo, scadenza_iscrizione").eq("corso_id", corsoId),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/admin/corsi" className="text-sm text-muted-foreground hover:underline">
          ← Gestione corsi
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-1">Nuova edizione — {corso.titolo}</h1>
        <p className="text-muted-foreground mt-1">
          Titolo, descrizioni, prezzi e metodo di pagamento sono già stati copiati dal corso
          originale. Aggiorna solo le date qui sotto.
        </p>
      </div>

      <DateNuovaEdizioneForm
        corsoId={corso.id}
        calendarioIniziale={corso.calendario ?? ""}
        earlyBirdScadenzaIniziale={corso.early_bird_scadenza}
        earlyBirdPercentuale={corso.early_bird_percentuale}
        firstMoverScadenzaIniziale={corso.first_mover_scadenza}
        firstMoverPercentuale={corso.first_mover_percentuale}
        moduli={moduli ?? []}
        pacchetti={pacchetti ?? []}
      />
    </div>
  );
}
