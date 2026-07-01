import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { CorsoForm } from "@/components/corso-form";
import { CorsoRiga } from "@/components/corso-riga";

export default async function GestioneCorsiPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  const { data: corsi } = await supabase
    .from("corsi")
    .select("id, titolo, descrizione, prezzo, attivo")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Gestione corsi</h1>
        <p className="text-muted-foreground mt-1">
          Inserisci a mano i corsi disponibili nel catalogo.
        </p>
      </div>

      <CorsoForm />

      <div className="space-y-3">
        {!corsi || corsi.length === 0 ? (
          <p className="text-muted-foreground">Nessun corso creato ancora.</p>
        ) : (
          corsi.map((corso) => <CorsoRiga key={corso.id} corso={corso} />)
        )}
      </div>
    </div>
  );
}
