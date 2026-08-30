"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { UtenteRiga, COLONNE_TABELLA_UTENTI, type Utente } from "@/components/utente-riga";

export function UtentiLista({ utenti, adminId }: { utenti: Utente[]; adminId: string }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtrati = q
    ? utenti.filter(
        (u) =>
          u.nome.toLowerCase().includes(q) ||
          u.cognome.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.azienda && u.azienda.toLowerCase().includes(q)),
      )
    : utenti;

  return (
    <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome, email o azienda…"
          className="max-w-sm"
        />
        <p className="text-sm text-muted-foreground shrink-0">
          {filtrati.length} corsist{filtrati.length === 1 ? "a" : "i"}
        </p>
      </div>

      {filtrati.length === 0 ? (
        <p className="text-muted-foreground p-6">Nessun utente trovato.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div
              className={`grid ${COLONNE_TABELLA_UTENTI} gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border`}
            >
              <span>Nome</span>
              <span>Azienda / Ruolo</span>
              <span className="text-center">Corsi</span>
              <span className="text-center">Ultimo</span>
              <span className="text-right">Ruolo</span>
            </div>
            {filtrati.map((utente) => (
              <UtenteRiga key={utente.id} utente={utente} isSelf={utente.id === adminId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
