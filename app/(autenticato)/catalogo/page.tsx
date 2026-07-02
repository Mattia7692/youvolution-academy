import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formattaPrezzo(prezzo: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(prezzo);
}

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: corsi } = await supabase
    .from("corsi")
    .select("id, titolo, descrizione, prezzo")
    .eq("attivo", true)
    .order("created_at", { ascending: true });

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
          {corsi.map((corso) => (
            <Card key={corso.id}>
              <CardHeader>
                <CardTitle>{corso.titolo}</CardTitle>
                {corso.descrizione && (
                  <CardDescription>{corso.descrizione}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-primary">
                  {formattaPrezzo(corso.prezzo)}
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/iscrizione/${corso.id}/passo-1`}>Iscriviti</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
