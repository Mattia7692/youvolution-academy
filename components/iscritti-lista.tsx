"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IscrittoRiga } from "@/components/iscritto-riga";
import type { StatoIscrizione } from "@/components/stato-badge";

type ScontoTipo = "nessuno" | "early_bird" | "first_mover" | "codice";

const ETICHETTA_SCONTO_RICERCA: Record<ScontoTipo, string> = {
  nessuno: "nessuno sconto",
  early_bird: "early bird",
  first_mover: "first mover",
  codice: "codice",
};

export type IscrittoConCorso = {
  iscrizioneId: string;
  stato: StatoIscrizione;
  nome: string | undefined;
  cognome: string | undefined;
  email: string | undefined;
  createdAt: string;
  scontoTipo: ScontoTipo | null;
  scontoPercentuale: number | null;
  codiceScontoInserito: string | null;
  codiceFirstMoverCorso: string | null;
  corsoId: string;
  corsoTitolo: string;
};

export function IscrittiLista({ iscritti }: { iscritti: IscrittoConCorso[] }) {
  const [query, setQuery] = useState("");
  const [corsoFiltro, setCorsoFiltro] = useState("tutti");

  const corsi = useMemo(() => {
    const mappa = new Map<string, string>();
    for (const i of iscritti) mappa.set(i.corsoId, i.corsoTitolo);
    return Array.from(mappa.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [iscritti]);

  const q = query.trim().toLowerCase();
  const filtrati = iscritti.filter((i) => {
    if (corsoFiltro !== "tutti" && i.corsoId !== corsoFiltro) return false;
    if (!q) return true;
    const testo = [
      i.nome,
      i.cognome,
      i.email,
      i.scontoTipo ? ETICHETTA_SCONTO_RICERCA[i.scontoTipo] : "",
      i.codiceScontoInserito,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return testo.includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome, cognome, email o sconto…"
          className="max-w-sm"
        />
        <Select value={corsoFiltro} onValueChange={setCorsoFiltro}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Tutti i corsi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i corsi</SelectItem>
            {corsi.map(([id, titolo]) => (
              <SelectItem key={id} value={id}>
                {titolo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtrati.length === 0 ? (
        <p className="text-muted-foreground">Nessun iscritto trovato.</p>
      ) : (
        <div className="space-y-3">
          {filtrati.map((iscrizione) => (
            <IscrittoRiga
              key={iscrizione.iscrizioneId}
              iscrizioneId={iscrizione.iscrizioneId}
              stato={iscrizione.stato}
              nome={iscrizione.nome}
              cognome={iscrizione.cognome}
              email={iscrizione.email}
              createdAt={iscrizione.createdAt}
              scontoTipo={iscrizione.scontoTipo}
              scontoPercentuale={iscrizione.scontoPercentuale}
              codiceScontoInserito={iscrizione.codiceScontoInserito}
              codiceFirstMoverCorso={iscrizione.codiceFirstMoverCorso}
              corsoTitolo={iscrizione.corsoTitolo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
