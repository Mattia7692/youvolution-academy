import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { CodiceScontoForm } from "@/components/codice-sconto-form";
import { CodiceScontoRiga } from "@/components/codice-sconto-riga";

export default async function CodiciScontoPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  const [{ data: codiciSconto }, { data: corsi }] = await Promise.all([
    supabase
      .from("codici_sconto")
      .select("id, codice, percentuale, corso_id, valido_da, valido_a, attivo")
      .order("created_at", { ascending: false }),
    supabase.from("corsi").select("id, titolo").order("titolo", { ascending: true }),
  ]);

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
            <CodiceScontoRiga key={codiceSconto.id} codiceSconto={codiceSconto} corsi={corsi ?? []} />
          ))
        )}
      </div>
    </div>
  );
}
