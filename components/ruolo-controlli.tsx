"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cambiaRuoloUtente } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Ruolo } from "@/lib/roles";

export function RuoloControlli({
  utenteId,
  ruolo,
  isSelf,
  viewerIsOwner,
  dark = false,
}: {
  utenteId: string;
  ruolo: Ruolo;
  isSelf: boolean;
  viewerIsOwner: boolean;
  dark?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const cambia = async (nuovoRuolo: Ruolo) => {
    setError(null);
    setIsLoading(true);
    const risultato = await cambiaRuoloUtente(utenteId, nuovoRuolo);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  const classeBottone = dark ? "bg-transparent border-white/25 text-white hover:bg-white/10" : undefined;

  if (isSelf) {
    return (
      <p className={cn("text-sm", dark ? "text-white/60" : "text-muted-foreground")}>
        Non puoi cambiare il tuo stesso ruolo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {ruolo === "corsista" && (
          <Button
            size="sm"
            variant="outline"
            className={classeBottone}
            disabled={isLoading}
            onClick={() => cambia("admin")}
          >
            Rendi admin
          </Button>
        )}
        {ruolo === "admin" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className={classeBottone}
              disabled={isLoading}
              onClick={() => cambia("corsista")}
            >
              Rendi corsista
            </Button>
            {viewerIsOwner && (
              <Button
                size="sm"
                variant="outline"
                className={classeBottone}
                disabled={isLoading}
                onClick={() => cambia("owner")}
              >
                Promuovi a owner
              </Button>
            )}
          </>
        )}
        {ruolo === "owner" && viewerIsOwner && (
          <Button
            size="sm"
            variant="outline"
            className={classeBottone}
            disabled={isLoading}
            onClick={() => cambia("admin")}
          >
            Revoca owner (rendi admin)
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
