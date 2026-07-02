import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Passo1Form } from "@/components/passo-1-form";

function formattaPrezzo(prezzo: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export default async function Passo1Page({
  params,
}: {
  params: Promise<{ corsoId: string }>;
}) {
  const { corsoId } = await params;
  const supabase = await createClient();

  const { data: corso } = await supabase
    .from("corsi")
    .select("id, titolo, prezzo, attivo")
    .eq("id", corsoId)
    .maybeSingle();

  if (!corso || !corso.attivo) {
    notFound();
  }

  // L'iscrizione vive nel database, legata all'account — non alla sessione del
  // browser. Se il corsista ha gia' completato il Passo 1 (su un altro
  // dispositivo, giorni fa, non importa), lo riportiamo dritto al punto dove
  // aveva lasciato, invece di fargli ricompilare i dati fiscali da capo.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: iscrizione } = await supabase
      .from("iscrizioni")
      .select("stato")
      .eq("corsista_id", user.id)
      .eq("corso_id", corsoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (iscrizione?.stato === "in_attesa_pagamento") {
      redirect(`/iscrizione/${corsoId}/passo-2`);
    }
    if (
      iscrizione?.stato === "cro_inserito" ||
      iscrizione?.stato === "cro_da_chiarire" ||
      iscrizione?.stato === "verificata"
    ) {
      redirect("/le-mie-iscrizioni");
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Iscrizione — Passo 1 di 2
        </h1>
        <p className="text-sm text-muted-foreground">Dati fiscali e prezzo</p>
        <p className="text-muted-foreground mt-1">
          {corso.titolo} — {formattaPrezzo(corso.prezzo)}
        </p>
      </div>
      <Passo1Form corsoId={corso.id} />
    </div>
  );
}
