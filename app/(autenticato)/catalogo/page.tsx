import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: corsi } = await supabase
    .from("corsi")
    .select("id, titolo, descrizione, calendario")
    .eq("attivo", true)
    .order("created_at", { ascending: true });

  // Corsi per cui l'utente ha già riservato il posto (passo 1 completato) ma
  // non ha ancora inserito il CRO: nel catalogo li segnaliamo per farlo
  // tornare a completare l'iscrizione invece di ripartire da zero.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let corsiInSospeso = new Set<string>();
  if (user) {
    const { data: sospese } = await supabase
      .from("iscrizioni")
      .select("corso_id")
      .eq("corsista_id", user.id)
      .eq("stato", "in_attesa_pagamento");
    corsiInSospeso = new Set((sospese ?? []).map((s) => s.corso_id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Catalogo corsi</h1>
        <p className="text-muted-foreground mt-1">
          Scegli un corso per avviare la tua iscrizione.
        </p>
      </div>

      {!corsi || corsi.length === 0 ? (
        <p className="text-muted-foreground">Nessun corso disponibile al momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {corsi.map((corso) => {
            const inSospeso = corsiInSospeso.has(corso.id);

            return (
              <Card
                key={corso.id}
                className={
                  inSospeso ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20" : undefined
                }
              >
                <CardHeader>
                  <CardTitle>{corso.titolo}</CardTitle>
                  {corso.descrizione && (
                    <CardDescription>{corso.descrizione}</CardDescription>
                  )}
                  {corso.calendario && (
                    <p className="text-sm text-muted-foreground mt-1">📅 {corso.calendario}</p>
                  )}
                  {inSospeso && (
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mt-1">
                      Iscrizione in corso — completa il pagamento
                    </p>
                  )}
                </CardHeader>
                <CardFooter>
                  <Button
                    asChild
                    className={inSospeso ? "w-full bg-orange-600 hover:bg-orange-700" : "w-full"}
                  >
                    <Link href={`/iscrizione/${corso.id}/${inSospeso ? "passo-2" : "passo-1"}`}>
                      {inSospeso ? "Continua iscrizione" : "Iscriviti"}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
