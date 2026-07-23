"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creaCodiceSconto } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CodiceScontoForm({ corsi }: { corsi: { id: string; titolo: string }[] }) {
  const [codice, setCodice] = useState("");
  const [percentuale, setPercentuale] = useState("");
  const [corsoId, setCorsoId] = useState("");
  const [validoDa, setValidoDa] = useState("");
  const [validoA, setValidoA] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const risultato = await creaCodiceSconto({
      codice,
      percentuale: Number(percentuale),
      corsoId: corsoId === "" ? null : corsoId,
      validoDa: validoDa === "" ? null : validoDa,
      validoA: validoA === "" ? null : validoA,
      attivo: true,
    });

    setIsLoading(false);

    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }

    setCodice("");
    setPercentuale("");
    setCorsoId("");
    setValidoDa("");
    setValidoA("");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuovo codice sconto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="codice">Codice</Label>
              <Input
                id="codice"
                required
                placeholder="Es. FUTURE15"
                value={codice}
                onChange={(e) => setCodice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="percentuale">Percentuale sconto</Label>
              <Input
                id="percentuale"
                type="number"
                min="1"
                max="100"
                step="1"
                required
                value={percentuale}
                onChange={(e) => setPercentuale(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="corso">Corso (vuoto = valido su tutti i corsi)</Label>
            <select
              id="corso"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={corsoId}
              onChange={(e) => setCorsoId(e.target.value)}
            >
              <option value="">Tutti i corsi</option>
              {corsi.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titolo}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valido_da">Valido da (facoltativo)</Label>
              <Input id="valido_da" type="date" value={validoDa} onChange={(e) => setValidoDa(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valido_a">Valido fino a (facoltativo)</Label>
              <Input id="valido_a" type="date" value={validoA} onChange={(e) => setValidoA(e.target.value)} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isLoading} className="self-start">
            {isLoading ? "Creazione…" : "Crea codice sconto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
