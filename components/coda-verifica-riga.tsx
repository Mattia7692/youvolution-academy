"use client";

import { useState } from "react";
import { verificaIscrizione, segnalaIscrizione } from "@/app/(autenticato)/admin/actions";
import { StatoBadge, type StatoIscrizione } from "@/components/stato-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CodaVerificaRiga({
  iscrizioneId,
  stato,
  corsoTitolo,
  prezzo,
  cro,
  notaAdmin,
  corsistaNome,
  corsistaEmail,
}: {
  iscrizioneId: string;
  stato: StatoIscrizione;
  corsoTitolo: string;
  prezzo: string;
  cro: string | null;
  notaAdmin: string | null;
  corsistaNome: string;
  corsistaEmail: string;
}) {
  const [mostraSegnalazione, setMostraSegnalazione] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifica = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await verificaIscrizione(iscrizioneId);
    setIsLoading(false);
    if (!risultato.ok) setError(risultato.error);
  };

  const handleSegnala = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await segnalaIscrizione(iscrizioneId, nota);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    setMostraSegnalazione(false);
    setNota("");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{corsoTitolo}</p>
          <p className="text-sm text-muted-foreground">
            {corsistaNome} · {corsistaEmail}
          </p>
          <p className="text-sm text-muted-foreground">
            {prezzo}
            {cro && ` · CRO ${cro}`}
          </p>
          {notaAdmin && stato === "cro_da_chiarire" && (
            <p className="text-sm text-red-700 mt-1">{notaAdmin}</p>
          )}
        </div>
        <StatoBadge stato={stato} />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {mostraSegnalazione ? (
        <div className="space-y-2">
          <Textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Motivo della segnalazione (es. CRO non corrisponde all'importo)"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleSegnala} disabled={isLoading}>
              Conferma segnalazione
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMostraSegnalazione(false)}>
              Annulla
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleVerifica} disabled={isLoading}>
            Verifica
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMostraSegnalazione(true)}
            disabled={isLoading}
          >
            Segnala
          </Button>
        </div>
      )}
    </div>
  );
}
