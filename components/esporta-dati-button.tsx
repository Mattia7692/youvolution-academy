"use client";

import { useState } from "react";
import { richiediEsportazioneDati } from "@/app/(autenticato)/account/actions";
import { Button } from "@/components/ui/button";

export function EsportaDatiButton() {
  const [error, setError] = useState<string | null>(null);
  const [inviato, setInviato] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await richiediEsportazioneDati();
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    setInviato(true);
  };

  return (
    <div className="flex flex-col gap-2 items-start">
      <Button type="button" variant="outline" disabled={isLoading} onClick={handleClick}>
        {isLoading ? "Preparazione…" : "Esporta i miei dati"}
      </Button>
      {inviato && (
        <p className="text-sm text-emerald-700">
          Ti abbiamo inviato un&apos;email con i tuoi dati ✓
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
