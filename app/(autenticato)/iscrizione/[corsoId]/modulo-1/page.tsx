import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Modulo1Form } from "@/components/modulo-1-form";

function formattaPrezzo(prezzo: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export default async function Modulo1Page({
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

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Iscrizione — Modulo 1</h1>
        <p className="text-muted-foreground mt-1">
          {corso.titolo} — {formattaPrezzo(corso.prezzo)}
        </p>
      </div>
      <Modulo1Form corsoId={corso.id} />
    </div>
  );
}
