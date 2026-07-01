import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { CodaVerificaRiga } from "@/components/coda-verifica-riga";
import type { StatoIscrizione } from "@/components/stato-badge";

function formattaPrezzo(prezzo: number | null) {
  if (prezzo === null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export default async function CodaVerificaPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  const { data: iscrizioni } = await supabase
    .from("iscrizioni")
    .select(
      "id, stato, prezzo_snapshot, cro, cro_inserito_at, nota_admin, corsi(titolo), profiles(nome, cognome, email)",
    )
    .in("stato", ["cro_inserito", "cro_da_chiarire"])
    .order("cro_inserito_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Coda di verifica</h1>
        <p className="text-muted-foreground mt-1">
          Iscrizioni in attesa di conferma del bonifico.
        </p>
      </div>

      {!iscrizioni || iscrizioni.length === 0 ? (
        <p className="text-muted-foreground">Nessuna iscrizione da verificare al momento.</p>
      ) : (
        <div className="space-y-3">
          {iscrizioni.map((iscrizione) => {
            const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;
            const corsista = Array.isArray(iscrizione.profiles)
              ? iscrizione.profiles[0]
              : iscrizione.profiles;

            return (
              <CodaVerificaRiga
                key={iscrizione.id}
                iscrizioneId={iscrizione.id}
                stato={iscrizione.stato as StatoIscrizione}
                corsoTitolo={corso?.titolo ?? "Corso"}
                prezzo={formattaPrezzo(iscrizione.prezzo_snapshot)}
                cro={iscrizione.cro}
                notaAdmin={iscrizione.nota_admin}
                corsistaNome={`${corsista?.nome ?? ""} ${corsista?.cognome ?? ""}`.trim()}
                corsistaEmail={corsista?.email ?? ""}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
