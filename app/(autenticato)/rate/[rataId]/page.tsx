import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RataForm } from "@/components/rata-form";
import { formattaPrezzo } from "@/lib/prezzo";
import { METODI_PAGAMENTO, type MetodoPagamento } from "@/lib/pagamento";

export default async function RataPage({
  params,
}: {
  params: Promise<{ rataId: string }>;
}) {
  const { rataId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rata } = await supabase
    .from("iscrizioni_rate")
    .select(
      "id, numero, importo, stato, iscrizioni!inner(corsista_id, corsi(titolo, metodo_pagamento))",
    )
    .eq("id", rataId)
    .maybeSingle();

  const iscrizione = rata
    ? Array.isArray(rata.iscrizioni)
      ? rata.iscrizioni[0]
      : rata.iscrizioni
    : null;

  if (!rata || !iscrizione || iscrizione.corsista_id !== user.id) {
    redirect("/le-mie-iscrizioni");
  }
  if (rata.stato !== "in_attesa_pagamento") {
    redirect("/le-mie-iscrizioni");
  }

  const corso = Array.isArray(iscrizione.corsi) ? iscrizione.corsi[0] : iscrizione.corsi;
  const coordinate =
    METODI_PAGAMENTO[(corso?.metodo_pagamento as MetodoPagamento | undefined) ?? "allianz"];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Rata {rata.numero}</h1>
        <p className="text-muted-foreground mt-1">
          {corso?.titolo} — {formattaPrezzo(rata.importo)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/50 p-5 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Coordinate bonifico</p>
        <p>Beneficiario: {coordinate.beneficiario}</p>
        <p>Banca: {coordinate.banca}</p>
        <p>IBAN: {coordinate.iban}</p>
        <p>
          Causale: iscrizione {corso?.titolo} — rata {rata.numero} — {user.email}
        </p>
        <p>
          Effettua il bonifico per l&apos;importo indicato sopra, poi inserisci qui
          sotto il CRO (Codice Riferimento Operazione) che ricevi dalla tua banca.
        </p>
      </div>

      <RataForm rataId={rata.id} importoSuggerito={rata.importo} />
    </div>
  );
}
