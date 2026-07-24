"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cambiaRuoloUtente } from "@/app/(autenticato)/admin/actions";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/role-badge";
import type { Ruolo } from "@/lib/roles";

export type Utente = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: Ruolo;
};

export function UtenteRiga({ utente, isSelf }: { utente: Utente; isSelf: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setError(null);
    setIsLoading(true);
    const nuovoRuolo: Ruolo = utente.ruolo === "admin" ? "corsista" : "admin";
    const risultato = await cambiaRuoloUtente(utente.id, nuovoRuolo);
    setIsLoading(false);
    if (!risultato.ok) {
      setError(risultato.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-medium text-foreground">
          {utente.nome} {utente.cognome}
          {isSelf && <span className="text-muted-foreground font-normal"> (tu)</span>}
        </p>
        <p className="text-sm text-muted-foreground">{utente.email}</p>
      </div>
      <div className="flex items-center gap-3">
        <RoleBadge ruolo={utente.ruolo} />
        <Button size="sm" variant="outline" onClick={handleToggle} disabled={isLoading || isSelf}>
          {utente.ruolo === "admin" ? "Rendi corsista" : "Rendi admin"}
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
