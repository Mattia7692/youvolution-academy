"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminaIscrizione } from "@/app/(autenticato)/admin/actions";
import { StatoBadge, type StatoIscrizione } from "@/components/stato-badge";
import { Button } from "@/components/ui/button";

function formattaData(data: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(data),
  );
}

export function IscrittoRiga({
  iscrizioneId,
  stato,
  nome,
  cognome,
  email,
  createdAt,
}: {
  iscrizioneId: string;
  stato: StatoIscrizione;
  nome: string | undefined;
  cognome: string | undefined;
  email: string | undefined;
  createdAt: string;
}) {
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleElimina = async () => {
    setError(null);
    setIsLoading(true);
    const risultato = await eliminaIscrizione(iscrizioneId);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {nome} {cognome}
          </p>
          <p className="text-sm text-muted-foreground">{email}</p>
          <p className="text-xs text-muted-foreground mt-1">Iscritto il {formattaData(createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatoBadge stato={stato} />
          {confermaEliminazione ? (
            <>
              <Button size="sm" variant="destructive" onClick={handleElimina} disabled={isLoading}>
                Conferma
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfermaEliminazione(false)}
                disabled={isLoading}
              >
                Annulla
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfermaEliminazione(true)}
              disabled={isLoading}
            >
              Elimina iscrizione
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
