import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Passo1Form } from "@/components/passo-1-form";

export default async function Passo1Page({
  params,
}: {
  params: Promise<{ corsoId: string }>;
}) {
  const { corsoId } = await params;
  const supabase = await createClient();

  const { data: corso } = await supabase
    .from("corsi")
    .select("id, titolo, attivo")
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

  const [{ data: moduli }, { data: pacchetti }, { data: pacchettoModuli }] = await Promise.all([
    supabase
      .from("moduli_corso")
      .select("id, titolo, imponibile, scadenza_iscrizione, data_inizio")
      .eq("corso_id", corsoId)
      .eq("attivo", true)
      .order("ordine", { ascending: true }),
    supabase
      .from("pacchetti_corso")
      .select("id, titolo, imponibile, scadenza_iscrizione")
      .eq("corso_id", corsoId)
      .eq("attivo", true),
    supabase.from("pacchetto_moduli").select("pacchetto_id, modulo_id"),
  ]);

  const moduliIdsPerPacchetto = new Map<string, string[]>();
  for (const riga of pacchettoModuli ?? []) {
    const lista = moduliIdsPerPacchetto.get(riga.pacchetto_id) ?? [];
    lista.push(riga.modulo_id);
    moduliIdsPerPacchetto.set(riga.pacchetto_id, lista);
  }

  const pacchettiConModuli = (pacchetti ?? []).map((p) => ({
    ...p,
    moduloIds: moduliIdsPerPacchetto.get(p.id) ?? [],
  }));

  if (!moduli || moduli.length === 0) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Iscrizione — Passo 1 di 2
        </h1>
        <p className="text-muted-foreground mt-1">{corso.titolo}</p>
      </div>
      <Passo1Form corsoId={corso.id} moduli={moduli} pacchetti={pacchettiConModuli} />
    </div>
  );
}
