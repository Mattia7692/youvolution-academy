import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Passo2Form } from "@/components/passo-2-form";

function formattaPrezzo(prezzo: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export default async function Passo2Page({
  params,
}: {
  params: Promise<{ corsoId: string }>;
}) {
  const { corsoId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: iscrizione } = await supabase
    .from("iscrizioni")
    .select("id, prezzo_snapshot, corsi(titolo)")
    .eq("corsista_id", user.id)
    .eq("corso_id", corsoId)
    .eq("stato", "in_attesa_pagamento")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!iscrizione) {
    redirect(`/iscrizione/${corsoId}/passo-1`);
  }

  const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Iscrizione — Passo 2 di 2
        </h1>
        <p className="text-sm text-muted-foreground">Conferma del bonifico</p>
        <p className="text-muted-foreground mt-1">
          {corso?.titolo} — {formattaPrezzo(iscrizione.prezzo_snapshot)}
        </p>
      </div>

      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-5 text-sm text-green-800 dark:text-green-400 space-y-1">
        <p className="font-medium text-green-900 dark:text-green-300">
          I tuoi dati sono stati salvati e il tuo posto è riservato
        </p>
        <p>
          Se vuoi puoi effettuare il bonifico adesso, oppure tornare su questa pagina
          quando preferisci per completare l&apos;iscrizione.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/50 p-5 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Coordinate bonifico</p>
        <p>Beneficiario: Youvolution</p>
        <p>IBAN: da comunicare</p>
        <p>Causale: iscrizione {corso?.titolo} — {user.email}</p>
        <p>
          Effettua il bonifico per l&apos;importo indicato sopra, poi inserisci qui
          sotto il CRO (Codice Riferimento Operazione) che ricevi dalla tua banca.
        </p>
      </div>

      <Passo2Form iscrizioneId={iscrizione.id} />
    </div>
  );
}
