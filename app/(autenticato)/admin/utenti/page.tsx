import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin, normalizzaRuolo } from "@/lib/roles";
import { UtenteRiga } from "@/components/utente-riga";

export default async function GestioneUtentiPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  const { data: profili } = await supabase
    .from("profiles")
    .select("id, nome, cognome, email, ruolo, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Gestione utenti</h1>
        <p className="text-muted-foreground mt-1">
          Chi si registra diventa corsista in automatico. Da qui puoi promuovere un corsista ad
          admin, o retrocedere un admin a corsista.
        </p>
      </div>

      {!profili || profili.length === 0 ? (
        <p className="text-muted-foreground">Nessun utente registrato ancora.</p>
      ) : (
        <div className="space-y-2">
          {profili.map((profilo) => (
            <UtenteRiga
              key={profilo.id}
              utente={{
                id: profilo.id,
                nome: profilo.nome,
                cognome: profilo.cognome,
                email: profilo.email,
                ruolo: normalizzaRuolo(profilo.ruolo),
              }}
              isSelf={profilo.id === admin.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
