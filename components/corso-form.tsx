"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaCorso } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export function CorsoForm() {
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [calendario, setCalendario] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState<"allianz" | "fineco">("allianz");
  const [earlyBirdAttivo, setEarlyBirdAttivo] = useState(false);
  const [earlyBirdScadenza, setEarlyBirdScadenza] = useState("");
  const [earlyBirdPercentuale, setEarlyBirdPercentuale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const risultato = await creaCorso({
      titolo,
      descrizione,
      calendario,
      metodo_pagamento: metodoPagamento,
      early_bird_scadenza: earlyBirdAttivo ? earlyBirdScadenza : null,
      early_bird_percentuale: earlyBirdAttivo ? Number(earlyBirdPercentuale) : null,
    });

    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    router.push(`/admin/corsi/${risultato.corsoId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuovo corso</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titolo">Titolo</Label>
            <Input id="titolo" required value={titolo} onChange={(e) => setTitolo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea id="descrizione" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendario">Calendario / date</Label>
            <Textarea
              id="calendario"
              placeholder="Facoltativo — es. orari, sede, ecc."
              value={calendario}
              onChange={(e) => setCalendario(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Metodo di pagamento</Label>
            <RadioGroup
              value={metodoPagamento}
              onValueChange={(v) => setMetodoPagamento(v as "allianz" | "fineco")}
              className="flex flex-wrap gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="allianz" id="pagamento-allianz" />
                <Label htmlFor="pagamento-allianz" className="font-normal">Allianz Bank</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fineco" id="pagamento-fineco" />
                <Label htmlFor="pagamento-fineco" className="font-normal">Fineco Bank</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Determina quali coordinate bancarie vede il corsista al passo 2 dell&apos;iscrizione.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={earlyBirdAttivo} onCheckedChange={(v) => setEarlyBirdAttivo(v === true)} />
              Offri uno sconto early bird per questo corso
            </label>
            {earlyBirdAttivo && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="early_bird_scadenza" className="text-xs text-muted-foreground">
                    Scade il
                  </Label>
                  <Input
                    id="early_bird_scadenza"
                    type="date"
                    required
                    value={earlyBirdScadenza}
                    onChange={(e) => setEarlyBirdScadenza(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="early_bird_percentuale" className="text-xs text-muted-foreground">
                    Sconto %
                  </Label>
                  <Input
                    id="early_bird_percentuale"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={earlyBirdPercentuale}
                    onChange={(e) => setEarlyBirdPercentuale(e.target.value)}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Vale per l&apos;intero corso (tutti i moduli e i pacchetti), non per singolo modulo. Se i
              pacchetti del corso hanno gia' un prezzo early bird incorporato, lascia questo
              disattivato per non scontare due volte.
            </p>
          </div>

          <p className="text-xs text-muted-foreground -mt-1">
            Il corso nasce come contenitore vuoto e disattivato. Prezzo, scadenze e posti si
            aggiungono subito dopo, creando i moduli nella pagina del corso — anche un corso
            a modulo singolo funziona così.
          </p>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isLoading} className="self-start">
            {isLoading ? "Creazione…" : "Crea corso"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
