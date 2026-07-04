import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { CHANGELOG } from "@/lib/changelog";
import { ChangelogVoce } from "@/components/changelog-voce";

export default async function InformazioniPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Informazioni</h1>
        <p className="text-muted-foreground mt-1">
          Cronologia delle versioni e delle modifiche al sistema.
        </p>
      </div>

      <div className="space-y-3">
        {CHANGELOG.map((voce, indice) => (
          <ChangelogVoce key={voce.versione} voce={voce} apertaInizialmente={indice === 0} />
        ))}
      </div>
    </div>
  );
}
