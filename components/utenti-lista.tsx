"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { UtenteRiga, type Utente } from "@/components/utente-riga";

export function UtentiLista({ utenti, adminId }: { utenti: Utente[]; adminId: string }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtrati = q
    ? utenti.filter(
        (u) =>
          u.nome.toLowerCase().includes(q) ||
          u.cognome.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
    : utenti;

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca per nome o email…"
        className="max-w-sm"
      />
      {filtrati.length === 0 ? (
        <p className="text-muted-foreground">Nessun utente trovato.</p>
      ) : (
        <div className="space-y-2">
          {filtrati.map((utente) => (
            <UtenteRiga key={utente.id} utente={utente} isSelf={utente.id === adminId} />
          ))}
        </div>
      )}
    </div>
  );
}
