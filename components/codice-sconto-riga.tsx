"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aggiornaCodiceSconto, eliminaCodiceSconto } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formattaData } from "@/lib/prezzo";

export type CodiceSconto = {
  id: string;
  codice: string;
  percentuale: number;
  corso_id: string | null;
  valido_da: string | null;
  valido_a: string | null;
  attivo: boolean;
};

export function CodiceScontoRiga({
  codiceSconto,
  corsi,
}: {
  codiceSconto: CodiceSconto;
  corsi: { id: string; titolo: string }[];
}) {
  const [inModifica, setInModifica] = useState(false);
  const [percentuale, setPercentuale] = useState(String(codiceSconto.percentuale));
  const [corsoId, setCorsoId] = useState(codiceSconto.corso_id ?? "");
  const [validoDa, setValidoDa] = useState(codiceSconto.valido_da ?? "");
  const [validoA, setValidoA] = useState(codiceSconto.valido_a ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const corso = corsi.find((c) => c.id === codiceSconto.corso_id);

  const handleSalva = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await aggiornaCodiceSconto(codiceSconto.id, {
      percentuale: Number(percentuale),
      corsoId: corsoId === "" ? null : corsoId,
      validoDa: validoDa === "" ? null : validoDa,
      validoA: validoA === "" ? null : validoA,
    });
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    setInModifica(false);
    router.refresh();
  };

  const handleToggleAttivo = async () => {
    setIsLoading(true);
    const risultato = await aggiornaCodiceSconto(codiceSconto.id, { attivo: !codiceSconto.attivo });
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  const handleElimina = async () => {
    setIsLoading(true);
    const risultato = await eliminaCodiceSconto(codiceSconto.id);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  if (inModifica) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="font-mono font-medium text-foreground">{codiceSconto.codice}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Percentuale sconto</Label>
            <Input
              type="number"
              min="1"
              max="100"
              step="1"
              value={percentuale}
              onChange={(e) => setPercentuale(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Corso (vuoto = tutti)</Label>
            <select
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
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Valido da</Label>
            <Input type="date" value={validoDa} onChange={(e) => setValidoDa(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Valido fino a</Label>
            <Input type="date" value={validoA} onChange={(e) => setValidoA(e.target.value)} />
          </div>
        </div>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSalva} disabled={isLoading}>
            Salva
          </Button>
          <Button size="sm" variant="outline" onClick={() => setInModifica(false)} disabled={isLoading}>
            Annulla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-mono font-medium text-foreground">{codiceSconto.codice}</p>
          <Badge variant={codiceSconto.attivo ? "default" : "secondary"}>
            {codiceSconto.attivo ? "Attivo" : "Disattivato"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          -{codiceSconto.percentuale}% · {corso ? corso.titolo : "Tutti i corsi"}
          {(codiceSconto.valido_da || codiceSconto.valido_a) && (
            <>
              {" "}
              ·{" "}
              {codiceSconto.valido_da ? `dal ${formattaData(codiceSconto.valido_da)}` : ""}
              {codiceSconto.valido_a ? ` al ${formattaData(codiceSconto.valido_a)}` : ""}
            </>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setInModifica(true)} disabled={isLoading}>
          Modifica
        </Button>
        <Button size="sm" variant="outline" onClick={handleToggleAttivo} disabled={isLoading}>
          {codiceSconto.attivo ? "Disattiva" : "Attiva"}
        </Button>
        <Button size="sm" variant="destructive" onClick={handleElimina} disabled={isLoading}>
          Elimina
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 w-full">
          {error}
        </p>
      )}
    </div>
  );
}
