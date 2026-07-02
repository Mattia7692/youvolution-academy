"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaCorso } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CorsoForm() {
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [calendario, setCalendario] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [postiDisponibili, setPostiDisponibili] = useState("");
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
      prezzo: Number(prezzo),
      attivo: true,
      posti_disponibili: postiDisponibili.trim() === "" ? null : Number(postiDisponibili),
    });

    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    setTitolo("");
    setDescrizione("");
    setCalendario("");
    setPrezzo("");
    setPostiDisponibili("");
    router.refresh();
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
              placeholder="Facoltativo — es. date delle sessioni, moduli, ecc."
              value={calendario}
              onChange={(e) => setCalendario(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prezzo">Prezzo (€)</Label>
              <Input
                id="prezzo"
                type="number"
                min="0"
                step="0.01"
                required
                value={prezzo}
                onChange={(e) => setPrezzo(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="posti_disponibili">Posti disponibili</Label>
              <Input
                id="posti_disponibili"
                type="number"
                min="0"
                step="1"
                placeholder="Vuoto = illimitati"
                value={postiDisponibili}
                onChange={(e) => setPostiDisponibili(e.target.value)}
              />
            </div>
          </div>

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
