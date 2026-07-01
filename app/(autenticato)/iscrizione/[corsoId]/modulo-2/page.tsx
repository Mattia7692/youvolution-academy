import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Modulo2Form } from "@/components/modulo-2-form";

function formattaPrezzo(prezzo: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export default async function Modulo2Page({
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
    redirect(`/iscrizione/${corsoId}/modulo-1`);
  }

  const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Iscrizione — Modulo 2</h1>
        <p className="text-muted-foreground mt-1">
          {corso?.titolo} — {formattaPrezzo(iscrizione.prezzo_snapshot)}
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

      <Modulo2Form iscrizioneId={iscrizione.id} />
    </div>
  );
}
