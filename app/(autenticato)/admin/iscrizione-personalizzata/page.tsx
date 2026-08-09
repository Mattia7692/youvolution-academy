import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { IscrizionePersonalizzataForm } from "@/components/iscrizione-personalizzata-form";

export default async function IscrizionePersonalizzataPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  const [{ data: corsisti }, { data: corsi }] = await Promise.all([
    supabase.from("profiles").select("id, nome, cognome, email").order("nome", { ascending: true }),
    supabase.from("corsi").select("id, titolo").eq("attivo", true).order("titolo", { ascending: true }),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Iscrizione su misura</h1>
        <p className="text-muted-foreground mt-1">
          Crea un&apos;iscrizione con un piano di pagamento a rate personalizzato, per accordi
          negoziati fuori dai pacchetti standard.
        </p>
      </div>
      <IscrizionePersonalizzataForm corsisti={corsisti ?? []} corsi={corsi ?? []} />
    </div>
  );
}
