import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { richiediAdmin } from "@/lib/roles";
import { CodaVerificaRiga } from "@/components/coda-verifica-riga";
import { RataVerificaRiga } from "@/components/rata-verifica-riga";
import type { StatoIscrizione } from "@/components/stato-badge";
import { formattaPrezzo } from "@/lib/prezzo";

export default async function CodaVerificaPage() {
  const supabase = await createClient();
  const admin = await richiediAdmin(supabase);
  if (!admin) redirect("/");

  // iscrizioni ha due FK verso profiles (corsista_id e verificata_da): senza
  // l'hint esplicito PostgREST non sa quale usare e l'embed fallisce con un
  // errore, che qui va sempre controllato esplicitamente (altrimenti la query
  // fallisce silenziosamente e la pagina sembra solo "vuota").
  const [{ data: iscrizioni, error }, { data: rate, error: errorRate }] = await Promise.all([
    supabase
      .from("iscrizioni")
      .select(
        "id, stato, totale_snapshot, cro, cro_inserito_at, nota_admin, sconto_tipo, sconto_percentuale, codice_sconto_inserito, corsi(titolo), profiles!corsista_id(nome, cognome, email)",
      )
      .in("stato", ["cro_inserito", "cro_da_chiarire"])
      .order("cro_inserito_at", { ascending: true }),
    supabase
      .from("iscrizioni_rate")
      .select(
        "id, numero, importo, stato, cro, cro_inserito_at, nota_admin, iscrizioni!inner(corsi(titolo), profiles!corsista_id(nome, cognome, email))",
      )
      .in("stato", ["cro_inserito", "cro_da_chiarire"])
      .order("cro_inserito_at", { ascending: true }),
  ]);

  if (error) {
    console.error("[coda-verifica] errore nel caricamento", error);
  }
  if (errorRate) {
    console.error("[coda-verifica] errore nel caricamento rate", errorRate);
  }

  // Per le iscrizioni che usano un codice sconto a usi limitati: quanti
  // utilizzi verificati ha già quel codice, così l'admin lo vede prima di
  // cliccare Verifica (il blocco/override vero è in verificaIscrizione).
  const codiciInUso = Array.from(
    new Set(
      (iscrizioni ?? [])
        .filter((i) => i.sconto_tipo === "codice" && i.codice_sconto_inserito)
        .map((i) => i.codice_sconto_inserito as string),
    ),
  );

  const utilizziPerCodice = new Map<string, { verificati: number; maxUtilizzi: number | null }>();
  if (codiciInUso.length > 0) {
    const [{ data: codici }, { data: verificate }] = await Promise.all([
      supabase.from("codici_sconto").select("codice, max_utilizzi").in("codice", codiciInUso),
      supabase
        .from("iscrizioni")
        .select("codice_sconto_inserito")
        .eq("stato", "verificata")
        .in("codice_sconto_inserito", codiciInUso),
    ]);

    for (const codice of codici ?? []) {
      utilizziPerCodice.set(codice.codice, { verificati: 0, maxUtilizzi: codice.max_utilizzi });
    }
    for (const v of verificate ?? []) {
      const codice = v.codice_sconto_inserito as string;
      const conteggio = utilizziPerCodice.get(codice) ?? { verificati: 0, maxUtilizzi: null };
      conteggio.verificati += 1;
      utilizziPerCodice.set(codice, conteggio);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Coda di verifica</h1>
        <p className="text-muted-foreground mt-1">
          Iscrizioni in attesa di conferma del bonifico.
        </p>
      </div>

      <h2 className="text-xl font-semibold text-foreground">Iscrizioni</h2>

      {!iscrizioni || iscrizioni.length === 0 ? (
        <p className="text-muted-foreground">Nessuna iscrizione da verificare al momento.</p>
      ) : (
        <div className="space-y-3">
          {iscrizioni.map((iscrizione) => {
            const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;
            const corsista = Array.isArray(iscrizione.profiles)
              ? iscrizione.profiles[0]
              : iscrizione.profiles;

            const utilizziCodice = iscrizione.codice_sconto_inserito
              ? utilizziPerCodice.get(iscrizione.codice_sconto_inserito)
              : undefined;

            return (
              <CodaVerificaRiga
                key={iscrizione.id}
                iscrizioneId={iscrizione.id}
                stato={iscrizione.stato as StatoIscrizione}
                scontoTipo={iscrizione.sconto_tipo as "nessuno" | "early_bird" | "first_mover" | "codice"}
                scontoPercentuale={iscrizione.sconto_percentuale}
                codiceScontoInserito={iscrizione.codice_sconto_inserito}
                codiceUtilizziVerificati={utilizziCodice?.verificati ?? null}
                codiceMaxUtilizzi={utilizziCodice?.maxUtilizzi ?? null}
                corsoTitolo={corso?.titolo ?? "Corso"}
                prezzo={formattaPrezzo(iscrizione.totale_snapshot)}
                cro={iscrizione.cro}
                notaAdmin={iscrizione.nota_admin}
                corsistaNome={`${corsista?.nome ?? ""} ${corsista?.cognome ?? ""}`.trim()}
                corsistaEmail={corsista?.email ?? ""}
              />
            );
          })}
        </div>
      )}

      <div className="pt-6 mt-2 border-t border-border">
        <h2 className="text-xl font-semibold text-foreground">Iscrizioni su misura</h2>
        <p className="text-muted-foreground mt-1">
          Rate di piani di pagamento personalizzati in attesa di conferma del bonifico.
        </p>
      </div>

      {!rate || rate.length === 0 ? (
        <p className="text-muted-foreground">Nessuna rata da verificare al momento.</p>
      ) : (
        <div className="space-y-3">
          {rate.map((rata) => {
            const iscrizione = Array.isArray(rata.iscrizioni) ? rata.iscrizioni[0] : rata.iscrizioni;
            const corso = iscrizione
              ? Array.isArray(iscrizione.corsi)
                ? iscrizione.corsi[0]
                : iscrizione.corsi
              : null;
            const corsista = iscrizione
              ? Array.isArray(iscrizione.profiles)
                ? iscrizione.profiles[0]
                : iscrizione.profiles
              : null;

            return (
              <RataVerificaRiga
                key={rata.id}
                rataId={rata.id}
                stato={rata.stato as StatoIscrizione}
                numero={rata.numero}
                prezzo={formattaPrezzo(rata.importo)}
                cro={rata.cro}
                notaAdmin={rata.nota_admin}
                corsoTitolo={corso?.titolo ?? "Corso"}
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
